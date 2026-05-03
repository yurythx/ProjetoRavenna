using System.Collections.Concurrent;

namespace RavennaServer.Simulation;

/// <summary>
/// Manages all NPC instances in the world.
///
/// Responsibilities:
///   - Spawn NPCs at startup (or when a map is loaded)
///   - Tick NPC AI every simulation tick (aggro, chase, attack, patrol, respawn)
///   - Expose NPCs to the SpatialGrid for interest management
///   - Emit combat events (damage, death) back to the SimulationLoop
/// </summary>
internal sealed class NpcManager
{
    // NPC entity IDs occupy the range [NPC_ID_BASE, uint.MaxValue)
    // Player ConvIds start at 1 and are typically small integers.
    public const uint NPC_ID_BASE = 100_000u;

    private readonly SpatialGrid                      _grid;
    private readonly ConcurrentDictionary<uint, NpcEntity> _npcs = new();
    private          uint                             _nextNpcId  = NPC_ID_BASE;

    // ── Combat event callbacks (wired up by SimulationLoop) ──────────────────
    public Action<uint, uint, int, int>? OnDamageDealt;   // (attackerId, targetId, damage, remainingHp)
    public Action<uint, uint, int>?      OnEntityDied;    // (entityId, killerId, xpReward)
    public Action<uint, string, int>?    OnLootDropped;   // (killerConvId, itemTemplateId, quantity)

    public NpcManager(SpatialGrid grid)
    {
        _grid = grid;
    }

    // ── Spawn ─────────────────────────────────────────────────────────────────

    public NpcEntity Spawn(string npcType, int x, int y, string zone = "plains", CombatProfile? profile = null)
    {
        uint id = Interlocked.Increment(ref _nextNpcId);
        var spawnPos = new EntityPosition { X = x, Y = y };

        var baseProfile   = profile ?? CombatProfileFor(npcType);
        var zoneScale     = ZoneRegistry.Get(zone);
        var scaledProfile = ZoneRegistry.Scale(baseProfile, zoneScale);

        var npc   = new NpcEntity(id, npcType, spawnPos, scaledProfile);
        _npcs[id] = npc;
        _grid.Upsert(id, x, y);
        return npc;
    }

    public IEnumerable<NpcEntity> All => _npcs.Values;

    public bool TryGet(uint id, out NpcEntity? npc) => _npcs.TryGetValue(id, out npc);

    // ── AI tick ───────────────────────────────────────────────────────────────

    /// <summary>
    /// Called once per simulation tick. Drives AI for all live NPCs.
    /// </summary>
    /// <param name="players">All active player sessions (read-only reference).</param>
    /// <param name="deltaSeconds">Elapsed seconds since last tick.</param>
    public void Tick(
        IReadOnlyDictionary<uint, PlayerSession> players,
        float deltaSeconds,
        long  nowMs)
    {
        foreach (var (_, npc) in _npcs)
        {
            if (npc.IsDead)
            {
                TryRespawn(npc, nowMs);
                continue;
            }

            switch (npc.State)
            {
                case CombatState.Idle:
                    ScanForAggro(npc, players);
                    break;

                case CombatState.Chasing:
                    TickChase(npc, players, deltaSeconds, nowMs);
                    break;

                case CombatState.Attacking:
                    TickAttack(npc, players, nowMs);
                    break;
            }

            // Advance movement
            if (npc.IsMoving)
            {
                bool arrived = MovementController.StepNpc(npc, deltaSeconds);
                if (arrived) MovementController.StopMovement(npc);
                _grid.Upsert(npc.EntityId, npc.Position.X, npc.Position.Y);
                UpdateNpcFlags(npc);
            }
        }
    }

    // ── Apply damage to an NPC (called by SimulationLoop when player attacks) ─

    public void ApplyDamage(uint npcId, uint attackerId, int damage, long nowMs)
    {
        if (!_npcs.TryGetValue(npcId, out var npc) || npc.IsDead) return;

        npc.CurrentHp -= damage;
        int remaining = Math.Max(npc.CurrentHp, 0);

        OnDamageDealt?.Invoke(attackerId, npcId, damage, remaining);

        if (npc.CurrentHp <= 0)
        {
            KillNpc(npc, attackerId, nowMs);
            return;
        }

        // NPC retaliates: switch aggro to attacker if idle/chasing something else
        if (npc.State == CombatState.Idle || npc.CombatTargetId != attackerId)
        {
            npc.CombatTargetId = attackerId;
            npc.State    = CombatState.Chasing;
        }
    }

    // ── Internal AI steps ────────────────────────────────────────────────────

    private void ScanForAggro(NpcEntity npc, IReadOnlyDictionary<uint, PlayerSession> players)
    {
        int aggroSq = npc.AggroRange * npc.AggroRange;

        foreach (var (convId, player) in players)
        {
            if (player.IsDead) continue;
            int distSq = MovementController.DistanceSq(npc.Position, player.Position);
            if (distSq <= aggroSq)
            {
                npc.CombatTargetId = convId;
                npc.State    = CombatState.Chasing;
                return;
            }
        }
    }

    private void TickChase(
        NpcEntity npc,
        IReadOnlyDictionary<uint, PlayerSession> players,
        float deltaSeconds,
        long  nowMs)
    {
        if (!players.TryGetValue(npc.CombatTargetId, out var target) || target.IsDead)
        {
            // Target gone — return to idle
            npc.CombatTargetId = 0;
            npc.State    = CombatState.Idle;
            return;
        }

        int dist = (int)MovementController.Distance(npc.Position, target.Position);

        if (dist <= npc.AttackRange)
        {
            npc.State = CombatState.Attacking;
            MovementController.StopMovement(npc);
        }
        else
        {
            // Tick-based destination update: chase current target position
            MovementController.SetDestination(npc, target.Position.X, target.Position.Y);
        }
    }

    private void TickAttack(
        NpcEntity npc,
        IReadOnlyDictionary<uint, PlayerSession> players,
        long nowMs)
    {
        if (!players.TryGetValue(npc.CombatTargetId, out var target) || target.IsDead)
        {
            npc.CombatTargetId = 0;
            npc.State    = CombatState.Idle;
            return;
        }

        int dist = (int)MovementController.Distance(npc.Position, target.Position);

        if (dist > npc.AttackRange)
        {
            // Target moved out of range — resume chase
            npc.State = CombatState.Chasing;
            return;
        }

        // Attack cooldown check
        long cooldownMs = (long)(npc.AttackCooldownSec * 1000);
        if (nowMs - npc.LastAttackMs < cooldownMs) return;

        // Hit!
        npc.LastAttackMs  = nowMs;
        target.CurrentHp -= npc.AttackDamage;
        int remaining     = Math.Max(target.CurrentHp, 0);

        OnDamageDealt?.Invoke(npc.EntityId, target.ConvId, npc.AttackDamage, remaining);

        if (target.CurrentHp <= 0)
        {
            target.CurrentHp   = 0;
            target.State       = CombatState.Dead;
            target.DeathTimeMs = nowMs;
            target.Flags      |= 0b0100u;  // bit2 = dead
            OnEntityDied?.Invoke(target.ConvId, npc.EntityId, 0);
        }

        // AoE slam (boss-only — only fires when AoeRadius > 0)
        if (npc.AoeRadius > 0 && npc.AoeDamage > 0)
            TryAoeAttack(npc, players, nowMs);
    }

    private void TryAoeAttack(
        NpcEntity npc,
        IReadOnlyDictionary<uint, PlayerSession> players,
        long nowMs)
    {
        long aoeCooldownMs = (long)(npc.AoeCooldownSec * 1000);
        if (nowMs - npc.LastAoeAttackMs < aoeCooldownMs) return;
        npc.LastAoeAttackMs = nowMs;

        int aoeSq = npc.AoeRadius * npc.AoeRadius;
        foreach (var (_, player) in players)
        {
            if (player.IsDead) continue;
            if (MovementController.DistanceSq(npc.Position, player.Position) > aoeSq) continue;

            player.CurrentHp -= npc.AoeDamage;
            int rem = Math.Max(player.CurrentHp, 0);
            OnDamageDealt?.Invoke(npc.EntityId, player.ConvId, npc.AoeDamage, rem);

            if (player.CurrentHp <= 0)
            {
                player.CurrentHp   = 0;
                player.State       = CombatState.Dead;
                player.DeathTimeMs = nowMs;
                player.Flags      |= 0b0100u;
                OnEntityDied?.Invoke(player.ConvId, npc.EntityId, 0);
            }
        }
    }

    private void KillNpc(NpcEntity npc, uint killerId, long nowMs)
    {
        npc.CurrentHp      = 0;
        npc.State    = CombatState.Dead;
        npc.CombatTargetId = 0;
        npc.DeathTimeMs    = nowMs;
        npc.IsMoving       = false;
        npc.Flags         |= 0b0100u;  // bit2 = dead
        _grid.Remove(npc.EntityId);

        OnEntityDied?.Invoke(npc.EntityId, killerId, npc.XpReward);

        // Loot roll: independent of XP — dropped even if killer gets no XP
        var drop = LootTable.Roll(npc.NpcType);
        if (drop.HasValue)
            OnLootDropped?.Invoke(killerId, drop.Value.ItemTemplateId, drop.Value.Quantity);
    }

    private void TryRespawn(NpcEntity npc, long nowMs)
    {
        if (nowMs - npc.DeathTimeMs < npc.RespawnDelayMs) return;
        npc.Respawn();
        _grid.Upsert(npc.EntityId, npc.Position.X, npc.Position.Y);
    }

    private static void UpdateNpcFlags(NpcEntity npc)
    {
        bool moving    = npc.IsMoving;
        bool attacking = npc.State == CombatState.Attacking;

        uint f = npc.Flags;
        f = moving    ? (f | 0b0001u) : (f & ~0b0001u);
        f = attacking ? (f | 0b0010u) : (f & ~0b0010u);
        npc.Flags = f;
    }

    private static CombatProfile CombatProfileFor(string npcType) => npcType switch
    {
        "wolf"            => CombatProfile.WolfNpc,
        "bandit"          => CombatProfile.BanditNpc,
        "elite_wolf"      => CombatProfile.EliteWolfNpc,
        "bandit_captain"  => CombatProfile.BanditCaptainNpc,
        _                 => CombatProfile.WolfNpc,
    };
}
