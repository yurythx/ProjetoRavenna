using RavennaServer.Simulation;
using System.Net;
using Xunit;

namespace RavennaServer.Tests;

public class NpcManagerTests
{
    private static SpatialGrid MakeGrid() => new(10_000, 10_000, 5_000);

    private static PlayerSession MakePlayer(uint convId, int x, int y,
        int hp = 100, CombatState state = CombatState.Idle)
    {
        var s = new PlayerSession(convId, $"user-{convId}", "hwid", new IPEndPoint(IPAddress.Loopback, 9000))
        {
            Position  = new EntityPosition { X = x, Y = y },
            CurrentHp = hp,
            MaxHp     = 100,
            State     = state,
        };
        return s;
    }

    // ── Spawn & lookup ────────────────────────────────────────────────────────

    [Fact]
    public void Spawn_ReturnsNpcWithCorrectType()
    {
        var mgr = new NpcManager(MakeGrid());
        var npc = mgr.Spawn("wolf", 1000, 2000);
        Assert.Equal("wolf", npc.NpcType);
    }

    [Fact]
    public void Spawn_NpcIdStartsAtBase()
    {
        var mgr = new NpcManager(MakeGrid());
        var npc = mgr.Spawn("wolf", 0, 0);
        Assert.True(npc.EntityId >= NpcManager.NPC_ID_BASE);
    }

    [Fact]
    public void Spawn_MultipleNpcs_IdsAreUnique()
    {
        var mgr = new NpcManager(MakeGrid());
        var a   = mgr.Spawn("wolf",   0, 0);
        var b   = mgr.Spawn("bandit", 0, 0);
        Assert.NotEqual(a.EntityId, b.EntityId);
    }

    [Fact]
    public void TryGet_AfterSpawn_Succeeds()
    {
        var mgr = new NpcManager(MakeGrid());
        var npc = mgr.Spawn("wolf", 0, 0);
        Assert.True(mgr.TryGet(npc.EntityId, out var found));
        Assert.Same(npc, found);
    }

    [Fact]
    public void TryGet_NonExistentId_ReturnsFalse()
    {
        var mgr = new NpcManager(MakeGrid());
        Assert.False(mgr.TryGet(99u, out _));
    }

    [Fact]
    public void All_ReturnsAllSpawnedNpcs()
    {
        var mgr = new NpcManager(MakeGrid());
        mgr.Spawn("wolf",   0, 0);
        mgr.Spawn("bandit", 0, 0);
        Assert.Equal(2, mgr.All.Count());
    }

    // ── ApplyDamage ───────────────────────────────────────────────────────────

    [Fact]
    public void ApplyDamage_ReducesHp()
    {
        var mgr  = new NpcManager(MakeGrid());
        var npc  = mgr.Spawn("wolf", 0, 0);
        int hpBefore = npc.CurrentHp;

        mgr.ApplyDamage(npc.EntityId, attackerId: 1u, damage: 20, nowMs: 0);

        Assert.Equal(hpBefore - 20, npc.CurrentHp);
    }

    [Fact]
    public void ApplyDamage_Fatal_FiresOnEntityDied()
    {
        var mgr = new NpcManager(MakeGrid());
        var npc = mgr.Spawn("wolf", 0, 0);

        uint? diedId = null;
        mgr.OnEntityDied = (entityId, _, _) => diedId = entityId;

        mgr.ApplyDamage(npc.EntityId, attackerId: 1u, damage: 9999, nowMs: 0);

        Assert.Equal(npc.EntityId, diedId);
    }

    [Fact]
    public void ApplyDamage_Fatal_SetsStateToDead()
    {
        var mgr = new NpcManager(MakeGrid());
        var npc = mgr.Spawn("wolf", 0, 0);
        mgr.ApplyDamage(npc.EntityId, attackerId: 1u, damage: 9999, nowMs: 0);
        Assert.Equal(CombatState.Dead, npc.State);
    }

    [Fact]
    public void ApplyDamage_Fatal_XpRewardPassedToCallback()
    {
        var mgr = new NpcManager(MakeGrid());
        var npc = mgr.Spawn("wolf", 0, 0);
        int xp  = 0;
        mgr.OnEntityDied = (_, _, xpReward) => xp = xpReward;

        mgr.ApplyDamage(npc.EntityId, attackerId: 1u, damage: 9999, nowMs: 0);

        Assert.True(xp > 0, "Wolf should grant XP on death");
    }

    [Fact]
    public void ApplyDamage_UnknownId_DoesNotThrow()
    {
        var mgr = new NpcManager(MakeGrid());
        var ex  = Record.Exception(() => mgr.ApplyDamage(9999u, 1u, 10, 0));
        Assert.Null(ex);
    }

    // ── Aggro / Tick ─────────────────────────────────────────────────────────

    [Fact]
    public void Tick_PlayerWithinAggroRange_NpcEntersChaseState()
    {
        var grid = MakeGrid();
        var mgr  = new NpcManager(grid);
        var npc  = mgr.Spawn("wolf", 0, 0);

        // Wolf AggroRange = 800 cm — player at (500, 0) is within range
        var player  = MakePlayer(convId: 1u, x: 500, y: 0);
        var players = new Dictionary<uint, PlayerSession> { [player.ConvId] = player };

        grid.Upsert(player.ConvId, player.Position.X, player.Position.Y);

        mgr.Tick(players, deltaSeconds: 0.033f, nowMs: 1000);

        Assert.Equal(CombatState.Chasing, npc.State);
        Assert.Equal(player.ConvId, npc.CombatTargetId);
    }

    [Fact]
    public void Tick_PlayerOutsideAggroRange_NpcStaysIdle()
    {
        var grid = MakeGrid();
        var mgr  = new NpcManager(grid);
        var npc  = mgr.Spawn("wolf", 0, 0);

        // Wolf AggroRange = 800 cm — player at (2000, 0) is outside
        var player  = MakePlayer(convId: 1u, x: 2000, y: 0);
        var players = new Dictionary<uint, PlayerSession> { [player.ConvId] = player };

        mgr.Tick(players, deltaSeconds: 0.033f, nowMs: 1000);

        Assert.Equal(CombatState.Idle, npc.State);
    }

    [Fact]
    public void Tick_DeadPlayer_NpcDoesNotAggro()
    {
        var grid = MakeGrid();
        var mgr  = new NpcManager(grid);
        var npc  = mgr.Spawn("wolf", 0, 0);

        var player = MakePlayer(convId: 1u, x: 100, y: 0, state: CombatState.Dead);
        var players = new Dictionary<uint, PlayerSession> { [player.ConvId] = player };

        mgr.Tick(players, deltaSeconds: 0.033f, nowMs: 1000);

        Assert.Equal(CombatState.Idle, npc.State);
    }

    [Fact]
    public void Tick_NpcAttacking_InRange_FiresOnDamageDealt()
    {
        var grid = MakeGrid();
        var mgr  = new NpcManager(grid);
        var npc  = mgr.Spawn("wolf", 0, 0);

        // Put NPC in attacking state, target nearby
        var player  = MakePlayer(convId: 1u, x: 50, y: 0);
        var players = new Dictionary<uint, PlayerSession> { [player.ConvId] = player };

        npc.State          = CombatState.Attacking;
        npc.CombatTargetId = player.ConvId;
        npc.LastAttackMs   = 0;

        grid.Upsert(player.ConvId, player.Position.X, player.Position.Y);

        bool damageFired = false;
        mgr.OnDamageDealt = (_, _, _, _) => damageFired = true;

        mgr.Tick(players, deltaSeconds: 0.033f, nowMs: 5000); // 5s after last attack

        Assert.True(damageFired);
    }

    [Fact]
    public void Tick_DeadNpc_AfterRespawnDelay_RespondsAgain()
    {
        var grid = MakeGrid();
        var mgr  = new NpcManager(grid);
        var npc  = mgr.Spawn("wolf", 0, 0);

        // Kill the NPC
        npc.State      = CombatState.Dead;
        npc.CurrentHp  = 0;
        npc.DeathTimeMs = 0;

        var players = new Dictionary<uint, PlayerSession>();

        // Tick before respawn delay (15 000 ms) — still dead
        mgr.Tick(players, 0.033f, nowMs: 5_000);
        Assert.Equal(CombatState.Dead, npc.State);

        // Tick after respawn delay — should respawn
        mgr.Tick(players, 0.033f, nowMs: 16_000);
        Assert.Equal(CombatState.Idle, npc.State);
        Assert.Equal(npc.MaxHp, npc.CurrentHp);
    }

    [Fact]
    public void Tick_NoPlayers_NpcsStayIdle()
    {
        var mgr = new NpcManager(MakeGrid());
        mgr.Spawn("wolf", 0, 0);
        mgr.Spawn("bandit", 1000, 1000);

        var ex = Record.Exception(() =>
            mgr.Tick(new Dictionary<uint, PlayerSession>(), 0.033f, 1000));

        Assert.Null(ex);
        Assert.All(mgr.All, n => Assert.Equal(CombatState.Idle, n.State));
    }
}
