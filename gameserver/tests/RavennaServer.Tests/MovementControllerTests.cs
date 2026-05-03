using RavennaServer.Simulation;
using System.Net;
using Xunit;

namespace RavennaServer.Tests;

public class MovementControllerTests
{
    private static PlayerSession MakeSession(int x = 0, int y = 0) =>
        new(1u, "user-1", "hwid-1", new IPEndPoint(IPAddress.Loopback, 9000))
        {
            Position    = new EntityPosition { X = x, Y = y },
            MovementSpeed = 400,
        };

    // ── Distance ─────────────────────────────────────────────────────────────

    [Fact]
    public void Distance_SamePoint_ReturnsZero()
    {
        var a = new EntityPosition { X = 100, Y = 200 };
        Assert.Equal(0f, MovementController.Distance(a, a), precision: 1);
    }

    [Fact]
    public void Distance_3_4_5_Triangle_Returns5()
    {
        var a = new EntityPosition { X = 0,   Y = 0 };
        var b = new EntityPosition { X = 300, Y = 400 };
        Assert.Equal(500f, MovementController.Distance(a, b), precision: 0);
    }

    [Fact]
    public void DistanceSq_3_4_5_Triangle_Returns250000()
    {
        var a = new EntityPosition { X = 0,   Y = 0 };
        var b = new EntityPosition { X = 300, Y = 400 };
        Assert.Equal(250_000, MovementController.DistanceSq(a, b));
    }

    // ── SetDestination ───────────────────────────────────────────────────────

    [Fact]
    public void SetDestination_SetsIsMovingTrue()
    {
        var s = MakeSession();
        MovementController.SetDestination(s, 1000, 2000);
        Assert.True(s.IsMoving);
    }

    [Fact]
    public void SetDestination_UpdatesDestination()
    {
        var s = MakeSession();
        MovementController.SetDestination(s, 500, 750);
        Assert.Equal(500, s.Destination.X);
        Assert.Equal(750, s.Destination.Y);
    }

    // ── StopMovement ─────────────────────────────────────────────────────────

    [Fact]
    public void StopMovement_ClearsIsMoving()
    {
        var s = MakeSession();
        MovementController.SetDestination(s, 1000, 0);
        MovementController.StopMovement(s);
        Assert.False(s.IsMoving);
    }

    // ── StepPlayer ───────────────────────────────────────────────────────────

    [Fact]
    public void StepPlayer_AlreadyAtDestination_ReturnsTrueImmediately()
    {
        var s = MakeSession(100, 200);
        MovementController.SetDestination(s, 100, 200);
        bool arrived = MovementController.StepPlayer(s, 0.033f);
        Assert.True(arrived);
    }

    [Fact]
    public void StepPlayer_NotAtDestination_MovesCloser()
    {
        var s = MakeSession(0, 0);
        MovementController.SetDestination(s, 2000, 0);

        float distBefore = MovementController.Distance(s.Position, s.Destination);
        MovementController.StepPlayer(s, 0.033f);
        float distAfter  = MovementController.Distance(s.Position, s.Destination);

        Assert.True(distAfter < distBefore, "Player should move closer to destination");
    }

    [Fact]
    public void StepPlayer_ExactArrival_SetsIsMovingFalse()
    {
        var s = MakeSession(0, 0);
        // Destination so close it will be covered in one step
        MovementController.SetDestination(s, 5, 0);

        // Run multiple steps until arrived or capped
        bool arrived = false;
        for (int i = 0; i < 100 && !arrived; i++)
            arrived = MovementController.StepPlayer(s, 1.0f);

        Assert.True(arrived);
        Assert.False(s.IsMoving);
    }

    [Fact]
    public void StepPlayer_HighSpeed_ArrivesWithinFewTicks()
    {
        var s = MakeSession(0, 0);
        s.MovementSpeed = 10_000;
        MovementController.SetDestination(s, 1000, 0);

        bool arrived = false;
        for (int i = 0; i < 10; i++)
        {
            arrived = MovementController.StepPlayer(s, 0.033f);
            if (arrived) break;
        }
        Assert.True(arrived, "Fast player should arrive in a few ticks");
    }

    // ── NPC movement ─────────────────────────────────────────────────────────

    [Fact]
    public void StepNpc_MovesCloser()
    {
        var grid = new SpatialGrid(10_000, 10_000, 5_000);
        var npc  = new NpcEntity(200_000u, "wolf",
            new EntityPosition { X = 0, Y = 0 },
            CombatProfile.WolfNpc);

        MovementController.SetDestination(npc, 2000, 0);
        float before = MovementController.Distance(npc.Position, npc.Destination);
        MovementController.StepNpc(npc, 0.033f);
        float after  = MovementController.Distance(npc.Position, npc.Destination);

        Assert.True(after < before);
    }
}
