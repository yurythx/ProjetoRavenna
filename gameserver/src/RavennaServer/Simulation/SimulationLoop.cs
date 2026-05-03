// =============================================================================
// SimulationLoop.cs — Loop de simulação autoritativo a 30 Hz
// =============================================================================
//
// O coração do servidor. Executa em uma thread OS dedicada e processa todos
// os estados de jogo: movimento, combate, NPCs e snapshots de mundo.
//
// Sequência de cada tick (1/30s ≈ 33ms):
//   1. Drena os ReceiveChannels de cada PlayerSession (mensagens KCP)
//   2. Atualiza o relógio KCP de cada session
//   3. Tenta respawn de jogadores mortos
//   4. Avança posições por MovementController.StepPlayer()
//   5. Poda efeitos ativos expirados, executa máquina de estado de combate
//   6. Delega AI dos NPCs para NpcManager.Tick()
//   7. Envia WorldSnapshot para cada jogador (interest management via SpatialGrid)
//   8. Expulsa sessões sem heartbeat (> 30s)
//
// Mensagens do cliente (msgType no primeiro byte):
//   0x01  C2S_Move         — movimento legado (client-reported, tratado como MoveTo)
//   0x02  C2S_Action       — ação genérica legada (fire-and-forget ao Django)
//   0x03  C2S_MoveTo       — destino de click-to-move
//   0x04  C2S_AttackTarget — iniciar ataque em alvo (NPC ou jogador)
//   0x05  C2S_StopAction   — cancelar movimento e combate
//   0x06  C2S_UseSkill     — ativar habilidade
//   0xFF  ping/heartbeat   — apenas atualiza LastHeartbeatMs
//
// Mensagens ao cliente (msgType no primeiro byte):
//   0x10  S2C_WorldSnapshot     — posição e estado de todas as entidades próximas
//   0x11  S2C_DamageEvent       — dano causado/recebido
//   0x12  S2C_EntityDied        — entidade morreu
//   0x13  S2C_CombatStateChanged — mudança de estado de combate
//   0x14  S2C_EffectApplied     — buff/debuff aplicado
//   0x20  S2C_Event ("kicked")  — expulsão do servidor
//
// Máquina de Estado de Combate do Jogador:
//   Idle → (AttackTarget) → Chasing → (dentro do range) → Attacking
//   Attacking → (alvo fora do range) → Chasing
//   Chasing/Attacking → (StopAction) → Idle
//   Qualquer → (HP=0) → Dead → (10s) → Idle (respawn)
//
// Política zero-alocação no tick:
//   Sem LINQ, sem new() no corpo do tick. Usa _neighbourScratch e
//   _snapshotScratch como listas pré-alocadas reutilizadas a cada tick.
//
// Party XP Split:
//   Ao matar NPC com XpReward > 0, o XP é dividido igualmente entre todos
//   os membros do grupo do killer que estejam dentro de 3000cm do kill.
// =============================================================================
using System.Buffers;
using System.Collections.Concurrent;
using System.Diagnostics;
using Google.Protobuf;
using RavennaServer.Bridge;
using RavennaServer.Proto;

namespace RavennaServer.Simulation;

/// <summary>
/// 30 Hz fixed-timestep authoritative simulation loop.
///
/// Per-tick responsibilities:
///   1. Drain per-player KCP receive channels
///   2. Process game messages (MoveTo, AttackTarget, StopAction, legacy Move/Action)
///   3. Advance player movement (authoritative steering)
///   4. Run player combat state machine (Chasing → Attacking → damage)
///   5. Tick NPC AI (via NpcManager)
///   6. Run interest-management and broadcast WorldSnapshots
///   7. Evict stale sessions (no heartbeat for 30 s)
///
/// Zero-alloc policy: no LINQ, no new() in the tick body.
/// </summary>
internal sealed class SimulationLoop
{
    private const int   TICK_HZ         = 30;
    private const float TICK_DELTA      = 1.0f / TICK_HZ;   // seconds per tick
    private const long  TICK_US         = 1_000_000L / TICK_HZ;
    private const long  HEARTBEAT_LIMIT = 30_000;            // ms
    private const int   RECV_BUF_SIZE   = 4096;

    private readonly SpatialGrid   _grid;
    private readonly DjangoBridge  _bridge;
    private readonly NpcManager    _npcs;

    private readonly ConcurrentDictionary<uint, PlayerSession> _sessions = new();

    // Pre-allocated scratch collections (single-threaded — safe to reuse)
    private readonly List<uint>        _neighbourScratch = new(128);
    private readonly List<EntityState> _snapshotScratch  = new(128);
    private readonly byte[]            _recvBuf          = new byte[RECV_BUF_SIZE];
    private          uint              _tick;

    public SimulationLoop(SpatialGrid grid, DjangoBridge bridge, NpcManager npcs)
    {
        _grid   = grid;
        _bridge = bridge;
        _npcs   = npcs;

        // Wire NPC combat event callbacks → broadcast helpers
        _npcs.OnDamageDealt  = BroadcastDamageEvent;
        _npcs.OnEntityDied   = BroadcastEntityDied;
        _npcs.OnLootDropped  = HandleLootDrop;
    }

    // ── Called by UdpSocketListener on handshake ──────────────────────────────

    public void OnPlayerConnected(PlayerSession session)
    {
        _sessions[session.ConvId] = session;
        Console.WriteLine($"[Sim] Connected  user={session.UserId}  conv={session.ConvId}");

        _ = _bridge.SendEventAsync(new GameEvent
        {
            EventType = "player_connected",
            PlayerId  = session.UserId,
            Data      = new Dictionary<string, object>
            {
                ["conv_id"]    = session.ConvId,
                ["hwid"]       = session.Hwid,
                ["ip_address"] = session.RemoteEndPoint.Address.ToString(),
            },
        });
    }

    public void OnPlayerDisconnected(uint convId)
    {
        if (_sessions.TryRemove(convId, out var s))
        {
            _grid.Remove(convId);
            Console.WriteLine($"[Sim] Disconnected  user={s.UserId}  conv={convId}");

            _ = _bridge.SendEventAsync(new GameEvent
            {
                EventType = "player_disconnected",
                PlayerId  = s.UserId,
                Data      = new Dictionary<string, object>
                {
                    ["conv_id"] = convId,
                    ["pos_x"]   = s.Position.X,
                    ["pos_y"]   = s.Position.Y,
                    ["hp"]      = s.CurrentHp,
                },
            });
        }
    }

    // ── Main loop ─────────────────────────────────────────────────────────────

    public Task RunAsync(CancellationToken ct) =>
        Task.Factory.StartNew(() => Loop(ct),
            ct, TaskCreationOptions.LongRunning, TaskScheduler.Default);

    private void Loop(CancellationToken ct)
    {
        long nextTickUs = GetMicroseconds();

        while (!ct.IsCancellationRequested)
        {
            long now = GetMicroseconds();
            if (now < nextTickUs)
            {
                long waitMs = (nextTickUs - now) / 1_000;
                if (waitMs > 1) Thread.Sleep((int)(waitMs - 1));
                continue;
            }

            nextTickUs += TICK_US;
            _tick++;

            Tick(Environment.TickCount64);
        }
    }

    // ── Single simulation tick ────────────────────────────────────────────────

    private void Tick(long nowMs)
    {
        // 1. Drain receive channels + advance KCP clocks
        foreach (var (_, session) in _sessions)
        {
            session.Kcp?.Update((uint)(nowMs & 0xFFFF_FFFF));

            while (session.ReceiveChannel.Reader.TryRead(out var item))
            {
                try
                {
                    bool valid = session.Kcp?.Input(item.buf.AsSpan(0, item.len)) ?? false;
                    if (valid)
                        while (true)
                        {
                            int n = session.Kcp!.Recv(_recvBuf.AsSpan());
                            if (n <= 0) break;
                            ProcessMessage(session, _recvBuf.AsSpan(0, n), nowMs);
                        }
                }
                finally { ArrayPool<byte>.Shared.Return(item.buf); }
            }

            // Evict stale sessions
            if (nowMs - session.LastHeartbeatMs > HEARTBEAT_LIMIT)
            {
                KickPlayer(session, "timeout");
                continue;
            }
        }

        // 2. Player respawn tick (before movement so respawned players can act this tick)
        foreach (var (_, session) in _sessions)
        {
            if (session.IsDead)
                TryRespawnPlayer(session, nowMs);
        }

        // 3. Advance player movement
        foreach (var (_, session) in _sessions)
        {
            if (session.IsDead) continue;

            bool arrived = MovementController.StepPlayer(session, TICK_DELTA);
            if (arrived) MovementController.StopMovement(session);

            _grid.Upsert(session.ConvId, session.Position.X, session.Position.Y);
            UpdatePlayerFlags(session);
        }

        // 4. Prune expired effects, then run player combat tick (Chasing / Attacking)
        foreach (var (_, session) in _sessions)
        {
            if (session.IsDead) continue;
            PruneExpiredEffects(session, nowMs);
            TickPlayerCombat(session, nowMs);
        }

        // 5. NPC AI tick
        _npcs.Tick(_sessions, TICK_DELTA, nowMs);

        // 6. Broadcast WorldSnapshot (every tick at 30 Hz)
        BroadcastSnapshots();
    }

    // ── Message dispatch ──────────────────────────────────────────────────────

    private void ProcessMessage(PlayerSession session, ReadOnlySpan<byte> data, long nowMs)
    {
        if (data.IsEmpty) return;
        byte msgType = data[0];
        var  payload = data[1..];

        switch (msgType)
        {
            case 0x01: HandleLegacyMove(session, payload);         break;  // C2S_Move (legacy)
            case 0x02: HandleLegacyAction(session, payload);       break;  // C2S_Action (legacy)
            case 0x03: HandleMoveTo(session, payload);             break;  // C2S_MoveTo
            case 0x04: HandleAttackTarget(session, payload, nowMs);break;  // C2S_AttackTarget
            case 0x05: HandleStopAction(session);                  break;  // C2S_StopAction
            case 0x06: HandleUseSkill(session, payload, nowMs);   break;  // C2S_UseSkill
            case 0xFF: session.LastHeartbeatMs = nowMs;            break;  // ping/heartbeat
        }
    }

    // Click-to-move: server takes ownership of position from this point on
    private void HandleMoveTo(PlayerSession session, ReadOnlySpan<byte> payload)
    {
        C2S_MoveTo msg;
        try { msg = C2S_MoveTo.Parser.ParseFrom(payload.ToArray()); }
        catch { return; }

        // MoveTo cancels any active combat
        session.CombatTargetId = 0;
        MovementController.SetDestination(session, msg.DestX, msg.DestY);
        session.LastHeartbeatMs = Environment.TickCount64;
    }

    // Lock onto a target → begin Chase-to-Attack
    private void HandleAttackTarget(PlayerSession session, ReadOnlySpan<byte> payload, long nowMs)
    {
        C2S_AttackTarget msg;
        try { msg = C2S_AttackTarget.Parser.ParseFrom(payload.ToArray()); }
        catch { return; }

        // Faction check: players may only attack enemies of the opposing faction
        if (!IsNpcId(msg.TargetId) &&
            _sessions.TryGetValue(msg.TargetId, out var targetSession) &&
            !IsValidPvpTarget(session, targetSession))
            return;

        session.CombatTargetId  = msg.TargetId;
        session.State     = CombatState.Chasing;
        session.IsMoving        = false;  // movement driven by chase loop, not click
        session.LastHeartbeatMs = nowMs;

        SendCombatStateChanged(session);
    }

    // Cancel movement and combat
    private void HandleStopAction(PlayerSession session)
    {
        session.CombatTargetId = 0;
        MovementController.StopMovement(session);
        session.State = CombatState.Idle;
        session.LastHeartbeatMs = Environment.TickCount64;

        SendCombatStateChanged(session);
    }

    // Activate a skill: validate cooldown, apply effect, notify Django
    private void HandleUseSkill(PlayerSession session, ReadOnlySpan<byte> payload, long nowMs)
    {
        if (session.IsDead) return;

        C2S_UseSkill msg;
        try { msg = C2S_UseSkill.Parser.ParseFrom(payload.ToArray()); }
        catch { return; }

        if (!SkillRegistry.TryGet(msg.SkillId, out var skill) || skill is null) return;

        // Cooldown check
        if (session.SkillCooldowns.TryGetValue(msg.SkillId, out long readyAt) && nowMs < readyAt)
            return;

        // Mana check
        if (skill.ManaCost > 0 && session.CurrentMana < skill.ManaCost)
            return;

        long cooldownMs = (long)(skill.CooldownSec * 1000);
        session.SkillCooldowns[msg.SkillId] = nowMs + cooldownMs;
        session.LastHeartbeatMs = nowMs;

        // Deduct mana
        if (skill.ManaCost > 0)
            session.CurrentMana = Math.Max(0, session.CurrentMana - skill.ManaCost);

        int skillLevel = session.SkillLevels.TryGetValue(msg.SkillId, out int lvl) ? lvl : 1;
        float levelScale = 1f + (skillLevel - 1) * 0.15f;  // +15% damage per level above 1

        // ── Heal (self-targeted) ──────────────────────────────────────────────
        if (skill.Targeting == SkillTargeting.Self && skill.HealAmount > 0)
        {
            int healAmount = (int)(skill.HealAmount * (1f + (skillLevel - 1) * 0.10f));
            session.CurrentHp = Math.Min(session.CurrentHp + healAmount, session.MaxHp);
            BroadcastDamageEventWithSkill(session.ConvId, session.ConvId,
                                          -healAmount, session.CurrentHp, msg.SkillId);
            NotifyDjangoSkillUsed(session, msg.SkillId);
            return;
        }

        // ── Self buff ────────────────────────────────────────────────────────
        if (skill.Targeting == SkillTargeting.Self && skill.BuffEffectType.HasValue)
        {
            int buffValue    = (int)(skill.BuffValue * (1f + (skillLevel - 1) * 0.05f));
            long expiresAtMs = nowMs + (long)(skill.BuffDurationSec * 1000);
            session.ActiveEffects.Add(new ActiveEffect(
                skill.BuffEffectType.Value, buffValue, expiresAtMs, session.ConvId));
            BroadcastEffectApplied(session, session.ConvId, msg.SkillId,
                skill.BuffEffectType.Value, buffValue, expiresAtMs);
            NotifyDjangoSkillUsed(session, msg.SkillId);
            return;
        }

        // ── AoE ───────────────────────────────────────────────────────────────
        if (skill.AoeRadius > 0)
        {
            EntityPosition center = msg.TargetId == 0
                ? session.Position
                : GetEntityPosition(msg.TargetId) ?? session.Position;

            int skillRange = skill.Range > 0 ? skill.Range : session.AttackRange;
            if (MovementController.Distance(session.Position, center) > skillRange) return;

            _neighbourScratch.Clear();
            _grid.GetNeighbours(center.X, center.Y, _neighbourScratch);

            int baseDamage = (int)(session.AttackDamage * skill.DamageMultiplier * levelScale);

            foreach (uint entityId in _neighbourScratch)
            {
                if (entityId == session.ConvId) continue;
                float dist = MovementController.Distance(center, GetEntityPosition(entityId) ?? center);
                if (dist > skill.AoeRadius) continue;

                ApplySkillDamageTo(entityId, session, baseDamage, msg.SkillId, nowMs);
            }

            NotifyDjangoSkillUsed(session, msg.SkillId);
            return;
        }

        // ── Single target ─────────────────────────────────────────────────────
        if (msg.TargetId == 0) return;

        int effectiveRange = skill.Range > 0 ? skill.Range : session.AttackRange;
        EntityPosition? targetPos = GetEntityPosition(msg.TargetId);
        if (targetPos is null) return;
        if (MovementController.Distance(session.Position, targetPos.Value) > effectiveRange) return;

        int singleDamage = (int)(session.AttackDamage * skill.DamageMultiplier * levelScale);
        ApplySkillDamageTo(msg.TargetId, session, singleDamage, msg.SkillId, nowMs);
        NotifyDjangoSkillUsed(session, msg.SkillId);
    }

    private void ApplySkillDamageTo(uint targetId, PlayerSession attacker, int damage, uint skillId, long nowMs)
    {
        // Apply attacker DamageBoostPct to raw skill damage before any mitigation
        int boostPct     = attacker.SumEffectPct(EffectType.DamageBoostPct, nowMs);
        int boostedDamage = boostPct > 0
            ? (int)(damage * (1f + boostPct / 100f))
            : damage;

        if (IsNpcId(targetId))
        {
            // NPCs have no defense in Phase 1 — boosted skill damage applied directly
            _npcs.ApplyDamage(targetId, attacker.ConvId, boostedDamage, nowMs);
            if (_npcs.TryGet(targetId, out var npc) && npc is not null)
                BroadcastDamageEventWithSkill(attacker.ConvId, targetId, boostedDamage,
                                              Math.Max(npc.CurrentHp, 0), skillId);
        }
        else if (_sessions.TryGetValue(targetId, out var targetPlayer))
        {
            // Skills also respect the faction rule (relevant for AoE hitting same-faction players)
            if (!IsValidPvpTarget(attacker, targetPlayer)) return;

            // PvP skill hit: DamageMode-aware mitigation, then active effect modifiers
            int mitigatedBase = attacker.DamageMode == DamageMode.Magical
                ? AttributeCalculator.ApplyMitigation(boostedDamage, targetPlayer.MagDefense)
                : AttributeCalculator.ApplyMitigation(boostedDamage, targetPlayer.PhysDefense);

            int defenseBoostPct = targetPlayer.SumEffectPct(EffectType.DefenseBoostPct, nowMs);
            int damageTakenPct  = targetPlayer.SumEffectPct(EffectType.DamageTakenIncreasePct, nowMs);
            int netDefPct       = defenseBoostPct - damageTakenPct;
            int mitigatedDamage = netDefPct != 0
                ? Math.Max(1, (int)(mitigatedBase * (1f - netDefPct / 100f)))
                : mitigatedBase;

            targetPlayer.CurrentHp -= mitigatedDamage;
            int remaining = Math.Max(targetPlayer.CurrentHp, 0);

            BroadcastDamageEventWithSkill(attacker.ConvId, targetId, mitigatedDamage, remaining, skillId);

            if (targetPlayer.CurrentHp <= 0)
            {
                targetPlayer.CurrentHp   = 0;
                targetPlayer.State       = CombatState.Dead;
                targetPlayer.DeathTimeMs = nowMs;
                targetPlayer.Flags      |= 0b0100u;
                BroadcastEntityDied(targetPlayer.ConvId, attacker.ConvId, 0);

                _ = _bridge.SendEventAsync(new GameEvent
                {
                    EventType = "player_killed",
                    PlayerId  = attacker.UserId,
                    Data      = new Dictionary<string, object>
                    {
                        ["victim_user_id"] = targetPlayer.UserId,
                    },
                });
            }
        }
    }

    private void BroadcastDamageEventWithSkill(
        uint attackerId, uint targetId, int damage, int remainingHp, uint skillId)
    {
        var evt = new S2C_DamageEvent
        {
            AttackerId  = attackerId,
            TargetId    = targetId,
            Damage      = damage,
            RemainingHp = remainingHp,
            SkillId     = skillId,
        };

        EntityPosition? pos = GetEntityPosition(targetId);
        if (pos is null) return;
        BroadcastEventToArea(pos.Value, 0x11, evt);
    }

    // ── Buff / debuff helpers ─────────────────────────────────────────────────

    private static void PruneExpiredEffects(PlayerSession session, long nowMs)
    {
        var effects = session.ActiveEffects;
        for (int i = effects.Count - 1; i >= 0; i--)
            if (!effects[i].IsActive(nowMs))
                effects.RemoveAt(i);
    }

    private void BroadcastEffectApplied(PlayerSession session, uint sourceId,
        uint skillId, EffectType effectType, int value, long expiresAtMs)
    {
        long durationMs = expiresAtMs - Environment.TickCount64;
        var evt = new RavennaServer.Proto.S2C_EffectApplied
        {
            EntityId   = session.ConvId,
            SourceId   = sourceId,
            SkillId    = skillId,
            EffectType = (uint)effectType,
            Value      = value,
            DurationMs = (uint)Math.Max(0L, durationMs),
        };
        BroadcastEventToArea(session.Position, 0x14, evt);
    }

    private void NotifyDjangoSkillUsed(PlayerSession session, uint skillId)
    {
        _ = _bridge.SendEventAsync(new GameEvent
        {
            EventType = "use_skill",
            PlayerId  = session.UserId,
            Data      = new Dictionary<string, object> { ["skill_id"] = skillId },
        });
    }

    // Legacy: client-reported position (kept for backwards compat)
    private void HandleLegacyMove(PlayerSession session, ReadOnlySpan<byte> payload)
    {
        C2S_Move move;
        try { move = C2S_Move.Parser.ParseFrom(payload.ToArray()); }
        catch { return; }

        // Treat as MoveTo with the reported position as destination
        session.CombatTargetId = 0;
        MovementController.SetDestination(session, move.X, move.Y);
        session.LastHeartbeatMs = Environment.TickCount64;
    }

    // Legacy: generic action → fire-and-forget to Django
    private void HandleLegacyAction(PlayerSession session, ReadOnlySpan<byte> payload)
    {
        C2S_Action action;
        try { action = C2S_Action.Parser.ParseFrom(payload.ToArray()); }
        catch { return; }

        _ = _bridge.SendEventAsync(new GameEvent
        {
            EventType = "player_action",
            PlayerId  = session.UserId,
            Data      = new Dictionary<string, object>
            {
                ["action_id"] = action.ActionId,
                ["target_id"] = action.TargetId,
            },
        });
    }

    // ── Player combat state machine ───────────────────────────────────────────

    private void TickPlayerCombat(PlayerSession session, long nowMs)
    {
        switch (session.State)
        {
            case CombatState.Chasing:
                TickPlayerChase(session, nowMs);
                break;

            case CombatState.Attacking:
                TickPlayerAttack(session, nowMs);
                break;
        }
    }

    private void TickPlayerChase(PlayerSession session, long nowMs)
    {
        if (!TryResolveTarget(session, out var targetPos, out bool targetDead))
        {
            // Target gone
            session.CombatTargetId = 0;
            session.State    = CombatState.Idle;
            SendCombatStateChanged(session);
            return;
        }

        if (targetDead)
        {
            session.CombatTargetId = 0;
            session.State    = CombatState.Idle;
            SendCombatStateChanged(session);
            return;
        }

        float dist = MovementController.Distance(session.Position, targetPos);

        if (dist <= session.AttackRange)
        {
            // Entered attack range — stop movement and start attacking
            session.State = CombatState.Attacking;
            session.IsMoving    = false;
            UpdatePlayerFlags(session);
            SendCombatStateChanged(session);
        }
        else
        {
            // Tick-based destination update: keep chasing current target pos
            session.Destination = targetPos;
            session.IsMoving    = true;
        }
    }

    private void TickPlayerAttack(PlayerSession session, long nowMs)
    {
        if (!TryResolveTarget(session, out var targetPos, out bool targetDead))
        {
            session.CombatTargetId = 0;
            session.State    = CombatState.Idle;
            SendCombatStateChanged(session);
            return;
        }

        if (targetDead)
        {
            session.CombatTargetId = 0;
            session.State    = CombatState.Idle;
            SendCombatStateChanged(session);
            return;
        }

        float dist = MovementController.Distance(session.Position, targetPos);

        if (dist > session.AttackRange)
        {
            // Target escaped — resume chase
            session.State = CombatState.Chasing;
            SendCombatStateChanged(session);
            return;
        }

        // Attack cooldown check
        long cooldownMs = (long)(session.AttackCooldownSec * 1000);
        if (nowMs - session.LastAttackMs < cooldownMs) return;

        session.LastAttackMs = nowMs;

        // Apply damage to target (player or NPC)
        if (IsNpcId(session.CombatTargetId))
        {
            // Apply attacker DamageBoostPct before hitting NPC (no NPC defense in Phase 1)
            int boostPct = session.SumEffectPct(EffectType.DamageBoostPct, nowMs);
            int rawDmg   = boostPct > 0
                ? (int)(session.RawAutoAttackDamage * (1f + boostPct / 100f))
                : session.RawAutoAttackDamage;
            _npcs.ApplyDamage(session.CombatTargetId, session.ConvId, rawDmg, nowMs);
        }
        else if (_sessions.TryGetValue(session.CombatTargetId, out var targetPlayer))
        {
            // Faction guard: abort if target became invalid (reconnect / faction change)
            if (!IsValidPvpTarget(session, targetPlayer))
            {
                session.CombatTargetId = 0;
                session.State    = CombatState.Idle;
                SendCombatStateChanged(session);
                return;
            }

            // PvP: full mitigation via DamageMode, then apply active effect modifiers
            int baseDmg = AttributeCalculator.ApplyDamage(
                session.DamageMode,
                session.PhysicalDamage, session.MagicalDamage,
                targetPlayer.PhysDefense, targetPlayer.MagDefense);

            int attackBoostPct  = session.SumEffectPct(EffectType.DamageBoostPct, nowMs);
            int defenseBoostPct = targetPlayer.SumEffectPct(EffectType.DefenseBoostPct, nowMs);
            int damageTakenPct  = targetPlayer.SumEffectPct(EffectType.DamageTakenIncreasePct, nowMs);
            int netPct          = attackBoostPct - defenseBoostPct + damageTakenPct;
            int mitigatedDamage = netPct != 0
                ? Math.Max(1, (int)(baseDmg * (1f + netPct / 100f)))
                : baseDmg;

            targetPlayer.CurrentHp -= mitigatedDamage;
            int remaining = Math.Max(targetPlayer.CurrentHp, 0);

            BroadcastDamageEvent(session.ConvId, targetPlayer.ConvId, mitigatedDamage, remaining);

            if (targetPlayer.CurrentHp <= 0)
            {
                targetPlayer.CurrentHp   = 0;
                targetPlayer.State       = CombatState.Dead;
                targetPlayer.DeathTimeMs = nowMs;
                targetPlayer.Flags      |= 0b0100u;
                BroadcastEntityDied(targetPlayer.ConvId, session.ConvId, 0);

                _ = _bridge.SendEventAsync(new GameEvent
                {
                    EventType = "player_killed",
                    PlayerId  = session.UserId,
                    Data      = new Dictionary<string, object>
                    {
                        ["victim_user_id"] = targetPlayer.UserId,
                    },
                });
            }
        }
    }

    // Resolve the target entity's current position and alive state
    private bool TryResolveTarget(PlayerSession session, out EntityPosition pos, out bool dead)
    {
        uint targetId = session.CombatTargetId;
        dead = false;
        pos  = default;

        if (targetId == 0) return false;

        if (IsNpcId(targetId))
        {
            if (!_npcs.TryGet(targetId, out var npc) || npc is null) return false;
            dead = npc.IsDead;
            pos  = npc.Position;
            return true;
        }

        if (_sessions.TryGetValue(targetId, out var player))
        {
            dead = player.IsDead;
            pos  = player.Position;
            return true;
        }

        return false;
    }

    private static bool IsNpcId(uint id) => id >= NpcManager.NPC_ID_BASE;

    /// <summary>
    /// Returns all party members of <paramref name="killer"/> (including killer) who are
    /// within XP sharing range (~3000 cm) of <paramref name="killPos"/>.
    /// Returns empty list if killer has no party.
    /// </summary>
    private List<PlayerSession> GetPartyMembersNearby(PlayerSession killer, EntityPosition killPos)
    {
        if (killer.PartyId is null) return [];

        var result = new List<PlayerSession>(5);
        const int XP_SHARE_RANGE_SQ = 3_000 * 3_000;

        foreach (var (_, s) in _sessions)
        {
            if (s.IsDead || s.PartyId != killer.PartyId) continue;
            if (MovementController.DistanceSq(s.Position, killPos) <= XP_SHARE_RANGE_SQ)
                result.Add(s);
        }

        return result;
    }

    private static bool IsValidPvpTarget(PlayerSession attacker, PlayerSession target)
    {
        if (!FactionHelper.AreEnemies(attacker.Faction, target.Faction)) return false;
        // Party members are always protected from friendly fire
        if (attacker.PartyId is not null && attacker.PartyId == target.PartyId) return false;
        return true;
    }

    // ── Snapshot broadcast ────────────────────────────────────────────────────

    private void BroadcastSnapshots()
    {
        foreach (var (convId, session) in _sessions)
        {
            _neighbourScratch.Clear();
            _snapshotScratch.Clear();

            _grid.GetNeighbours(session.Position.X, session.Position.Y, _neighbourScratch);

            foreach (uint neighbourId in _neighbourScratch)
            {
                EntityState? es = BuildEntityState(neighbourId);
                if (es is not null) _snapshotScratch.Add(es);
            }

            var snapshot = new S2C_WorldSnapshot { ServerTick = _tick };
            snapshot.Entities.AddRange(_snapshotScratch);

            SendToSession(session, 0x10, snapshot);
        }
    }

    private EntityState? BuildEntityState(uint entityId)
    {
        if (IsNpcId(entityId))
        {
            if (!_npcs.TryGet(entityId, out var npc) || npc is null) return null;
            return new EntityState
            {
                EntityId    = npc.EntityId,
                X           = npc.Position.X,
                Y           = npc.Position.Y,
                Flags       = npc.Flags,
                Hp          = npc.CurrentHp,
                MaxHp       = npc.MaxHp,
                TargetId    = npc.CombatTargetId,
                CombatState = (uint)npc.State,
            };
        }

        if (_sessions.TryGetValue(entityId, out var player))
        {
            return new EntityState
            {
                EntityId    = player.ConvId,
                X           = player.Position.X,
                Y           = player.Position.Y,
                Flags       = player.Flags,
                Hp          = player.CurrentHp,
                MaxHp       = player.MaxHp,
                TargetId    = player.CombatTargetId,
                CombatState = (uint)player.State,
            };
        }

        return null;
    }

    // ── Combat event broadcasts ───────────────────────────────────────────────

    private void BroadcastDamageEvent(uint attackerId, uint targetId, int damage, int remainingHp)
    {
        var evt = new S2C_DamageEvent
        {
            AttackerId  = attackerId,
            TargetId    = targetId,
            Damage      = damage,
            RemainingHp = remainingHp,
        };

        // Broadcast to all players in range of the target entity
        EntityPosition? targetPos = GetEntityPosition(targetId);
        if (targetPos is null) return;

        BroadcastEventToArea(targetPos.Value, 0x11, evt);
    }

    private void BroadcastEntityDied(uint entityId, uint killerId, int xpReward)
    {
        var evt = new S2C_EntityDied
        {
            EntityId = entityId,
            KillerId = killerId,
            XpReward = (uint)xpReward,
        };

        EntityPosition? pos = GetEntityPosition(entityId);
        if (pos is null) return;

        BroadcastEventToArea(pos.Value, 0x12, evt);

        // Notify Django to persist XP and NPC kill (quest progress + loot)
        if (_sessions.TryGetValue(killerId, out var killer))
        {
            if (xpReward > 0)
            {
                // Party XP split: find all party members near the kill and divide XP equally
                var xpRecipients = GetPartyMembersNearby(killer, pos!.Value);
                int share = xpRecipients.Count > 0
                    ? Math.Max(1, xpReward / xpRecipients.Count)
                    : xpReward;

                foreach (var recipient in xpRecipients)
                {
                    _ = _bridge.SendEventAsync(new GameEvent
                    {
                        EventType = "xp_gained",
                        PlayerId  = recipient.UserId,
                        Data      = new Dictionary<string, object> { ["amount"] = share },
                    });
                }

                // Killer always gets XP if not in a party or if already included above
                if (xpRecipients.Count == 0)
                {
                    _ = _bridge.SendEventAsync(new GameEvent
                    {
                        EventType = "xp_gained",
                        PlayerId  = killer.UserId,
                        Data      = new Dictionary<string, object> { ["amount"] = xpReward },
                    });
                }
            }

            if (IsNpcId(entityId) && _npcs.TryGet(entityId, out var deadNpc) && deadNpc is not null)
            {
                _ = _bridge.SendEventAsync(new GameEvent
                {
                    EventType = "npc_killed",
                    PlayerId  = killer.UserId,
                    Data      = new Dictionary<string, object>
                    {
                        ["npc_type"] = deadNpc.NpcType,
                        ["npc_id"]   = entityId,
                        ["pos_x"]    = pos.Value.X,
                        ["pos_y"]    = pos.Value.Y,
                    },
                });
            }
        }

        // Apply death penalty to the dying player (covers both NPC and PvP kills)
        if (!IsNpcId(entityId) && _sessions.TryGetValue(entityId, out var dyingPlayer))
        {
            _ = _bridge.SendEventAsync(new GameEvent
            {
                EventType = "player_died",
                PlayerId  = dyingPlayer.UserId,
                Data      = new Dictionary<string, object>
                {
                    ["cause"] = IsNpcId(killerId) ? "npc" : "pvp",
                },
            });
        }
    }

    private void HandleLootDrop(uint killerConvId, string itemTemplateId, int quantity)
    {
        if (!_sessions.TryGetValue(killerConvId, out var killer)) return;

        _ = _bridge.SendEventAsync(new GameEvent
        {
            EventType = "item_collected",
            PlayerId  = killer.UserId,
            Data      = new Dictionary<string, object>
            {
                ["item_template_id"] = itemTemplateId,
                ["quantity"]         = quantity,
            },
        });
    }

    private void SendCombatStateChanged(PlayerSession session)
    {
        var msg = new S2C_CombatStateChanged
        {
            EntityId    = session.ConvId,
            CombatState = (uint)session.State,
            TargetId    = session.CombatTargetId,
        };
        SendToSession(session, 0x13, msg);
    }

    // ── Area broadcast helper ─────────────────────────────────────────────────

    private void BroadcastEventToArea(EntityPosition center, byte msgType, IMessage msg)
    {
        _neighbourScratch.Clear();
        _grid.GetNeighbours(center.X, center.Y, _neighbourScratch);

        foreach (uint neighbourId in _neighbourScratch)
        {
            if (IsNpcId(neighbourId)) continue;
            if (!_sessions.TryGetValue(neighbourId, out var s)) continue;
            SendToSession(s, msgType, msg);
        }
    }

    private static void SendToSession(PlayerSession session, byte msgType, IMessage msg)
    {
        byte[] payload = msg.ToByteArray();
        byte[] packet  = ArrayPool<byte>.Shared.Rent(1 + payload.Length);
        packet[0] = msgType;
        payload.CopyTo(packet, 1);
        session.Kcp?.Send(packet.AsSpan(0, 1 + payload.Length));
        ArrayPool<byte>.Shared.Return(packet);
    }

    // ── Position lookup ───────────────────────────────────────────────────────

    private EntityPosition? GetEntityPosition(uint entityId)
    {
        if (IsNpcId(entityId))
        {
            if (_npcs.TryGet(entityId, out var npc) && npc is not null)
                return npc.Position;
            return null;
        }

        if (_sessions.TryGetValue(entityId, out var player))
            return player.Position;

        return null;
    }

    // ── Flag helpers ──────────────────────────────────────────────────────────

    private static void UpdatePlayerFlags(PlayerSession s)
    {
        bool moving    = s.IsMoving;
        bool attacking = s.State == CombatState.Attacking;
        bool dead      = s.State == CombatState.Dead;

        uint f = s.Flags & ~0b0111u;  // clear bits 0-2
        if (moving)    f |= 0b0001u;
        if (attacking) f |= 0b0010u;
        if (dead)      f |= 0b0100u;
        s.Flags = f;
    }

    // ── Respawn ───────────────────────────────────────────────────────────────

    private void TryRespawnPlayer(PlayerSession session, long nowMs)
    {
        if (nowMs - session.DeathTimeMs < PlayerSession.RESPAWN_DELAY_MS) return;

        session.CurrentHp      = session.MaxHp;
        session.CurrentMana    = session.MaxMana;
        session.State          = CombatState.Idle;
        session.CombatTargetId = 0;
        session.IsMoving       = false;
        session.Position       = session.SpawnPoint;
        session.Flags         &= ~0b0110u;  // clear dead (bit2) and attacking (bit1)
        session.ActiveEffects.Clear();       // buffs/debuffs don't survive death

        _grid.Upsert(session.ConvId, session.Position.X, session.Position.Y);

        var respawnMsg = new S2C_CombatStateChanged
        {
            EntityId    = session.ConvId,
            CombatState = (uint)CombatState.Idle,
            TargetId    = 0,
        };
        SendToSession(session, 0x13, respawnMsg);
    }

    // ── Kick ─────────────────────────────────────────────────────────────────

    private void KickPlayer(PlayerSession session, string reason)
    {
        var evt = new S2C_Event { EventType = "kicked",
                                  Payload = Google.Protobuf.ByteString.CopyFromUtf8(reason) };
        SendToSession(session, 0x20, evt);
        session.Kcp?.Update((uint)(Environment.TickCount64 & 0xFFFF_FFFF));
        OnPlayerDisconnected(session.ConvId);
    }

    private static long GetMicroseconds() =>
        Stopwatch.GetTimestamp() * 1_000_000L / Stopwatch.Frequency;
}
