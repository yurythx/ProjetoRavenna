using RavennaServer.Simulation;
using Xunit;

namespace RavennaServer.Tests;

public class NpcEntityTests
{
    private static NpcEntity MakeWolf(int x = 0, int y = 0) =>
        new(100_001u, "wolf", new EntityPosition { X = x, Y = y }, CombatProfile.WolfNpc);

    // ── Constructor ───────────────────────────────────────────────────────────

    [Fact]
    public void Constructor_SetsSpawnPoint()
    {
        var npc = MakeWolf(500, 750);
        Assert.Equal(500, npc.SpawnPoint.X);
        Assert.Equal(750, npc.SpawnPoint.Y);
    }

    [Fact]
    public void Constructor_SetsInitialPosition_ToSpawnPoint()
    {
        var npc = MakeWolf(500, 750);
        Assert.Equal(500, npc.Position.X);
        Assert.Equal(750, npc.Position.Y);
    }

    [Fact]
    public void Constructor_StateIsIdle()
    {
        var npc = MakeWolf();
        Assert.Equal(CombatState.Idle, npc.State);
    }

    [Fact]
    public void Constructor_WolfProfile_HpMatchesProfile()
    {
        var npc = MakeWolf();
        Assert.Equal(CombatProfile.WolfNpc.MaxHp, npc.MaxHp);
        Assert.Equal(CombatProfile.WolfNpc.MaxHp, npc.CurrentHp);
    }

    // ── IsDead / IsInCombat ───────────────────────────────────────────────────

    [Fact]
    public void IsDead_WhenStateIdle_ReturnsFalse()
    {
        var npc = MakeWolf();
        Assert.False(npc.IsDead);
    }

    [Fact]
    public void IsDead_WhenStateDead_ReturnsTrue()
    {
        var npc = MakeWolf();
        npc.State = CombatState.Dead;
        Assert.True(npc.IsDead);
    }

    [Fact]
    public void IsInCombat_WhenChasing_ReturnsTrue()
    {
        var npc = MakeWolf();
        npc.State = CombatState.Chasing;
        Assert.True(npc.IsInCombat);
    }

    [Fact]
    public void IsInCombat_WhenAttacking_ReturnsTrue()
    {
        var npc = MakeWolf();
        npc.State = CombatState.Attacking;
        Assert.True(npc.IsInCombat);
    }

    [Fact]
    public void IsInCombat_WhenIdle_ReturnsFalse()
    {
        var npc = MakeWolf();
        Assert.False(npc.IsInCombat);
    }

    // ── Respawn ───────────────────────────────────────────────────────────────

    [Fact]
    public void Respawn_RestoresFullHp()
    {
        var npc = MakeWolf();
        npc.CurrentHp = 0;
        npc.State     = CombatState.Dead;
        npc.Respawn();
        Assert.Equal(npc.MaxHp, npc.CurrentHp);
    }

    [Fact]
    public void Respawn_SetsStateToIdle()
    {
        var npc = MakeWolf();
        npc.State = CombatState.Dead;
        npc.Respawn();
        Assert.Equal(CombatState.Idle, npc.State);
    }

    [Fact]
    public void Respawn_RestoresPositionToSpawnPoint()
    {
        var npc = MakeWolf(1000, 2000);
        npc.Position = new EntityPosition { X = 5000, Y = 9000 };
        npc.Respawn();
        Assert.Equal(1000, npc.Position.X);
        Assert.Equal(2000, npc.Position.Y);
    }

    [Fact]
    public void Respawn_ClearsMovingState()
    {
        var npc = MakeWolf();
        npc.IsMoving = true;
        npc.Respawn();
        Assert.False(npc.IsMoving);
    }

    [Fact]
    public void Respawn_ClearsCombatTarget()
    {
        var npc = MakeWolf();
        npc.CombatTargetId = 42u;
        npc.Respawn();
        Assert.Equal(0u, npc.CombatTargetId);
    }
}
