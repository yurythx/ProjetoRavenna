namespace RavennaServer.Simulation;

/// <summary>
/// Authoritative tick-based movement for all entities.
///
/// Movement model:
///   - Entity steers toward Destination in a straight line at MovementSpeed cm/s.
///   - Server owns the position; client interpolates visually.
///   - Anti-speedhack: client-reported positions are IGNORED — only Destination
///     commands are accepted; the server moves the entity itself.
///   - Arrival threshold: entity is considered "at destination" when distance
///     falls below ARRIVAL_THRESHOLD_CM.
/// </summary>
internal static class MovementController
{
    private const int ARRIVAL_THRESHOLD_CM = 10;  // ~10 cm snap-to-destination

    /// <summary>
    /// Advance a player's position one tick toward its Destination.
    /// Returns true if the destination was reached this tick.
    /// </summary>
    public static bool StepPlayer(PlayerSession player, float deltaSeconds)
    {
        if (!player.IsMoving) return false;

        return StepEntity(
            ref player.Position,
            player.Destination,
            player.MovementSpeed,
            deltaSeconds);
    }

    /// <summary>
    /// Advance an NPC's position one tick toward its Destination.
    /// Returns true if destination was reached.
    /// </summary>
    public static bool StepNpc(NpcEntity npc, float deltaSeconds)
    {
        if (!npc.IsMoving) return false;

        return StepEntity(
            ref npc.Position,
            npc.Destination,
            npc.MovementSpeed,
            deltaSeconds);
    }

    /// <summary>
    /// Point entity toward a new destination and mark it as moving.
    /// Cancels any existing movement.
    /// </summary>
    public static void SetDestination(PlayerSession player, int destX, int destY)
    {
        player.Destination = new EntityPosition { X = destX, Y = destY };
        player.IsMoving    = true;
        player.State = CombatState.Moving;
        player.Flags       = SetFlag(player.Flags, 0, true);   // bit0 = moving
        player.Flags       = SetFlag(player.Flags, 1, false);  // bit1 = attacking
    }

    public static void SetDestination(NpcEntity npc, int destX, int destY)
    {
        npc.Destination = new EntityPosition { X = destX, Y = destY };
        npc.IsMoving    = true;
    }

    /// <summary>Stop movement immediately (arrival or command cancel).</summary>
    public static void StopMovement(PlayerSession player)
    {
        player.IsMoving = false;
        player.Flags    = SetFlag(player.Flags, 0, false);  // clear moving flag
        if (player.State == CombatState.Moving)
            player.State = CombatState.Idle;
    }

    public static void StopMovement(NpcEntity npc)
    {
        npc.IsMoving = false;
    }

    // ── Distance helpers ──────────────────────────────────────────────────────

    public static int DistanceSq(EntityPosition a, EntityPosition b)
    {
        long dx = a.X - b.X;
        long dy = a.Y - b.Y;
        return (int)Math.Min(dx * dx + dy * dy, int.MaxValue);
    }

    public static float Distance(EntityPosition a, EntityPosition b)
    {
        double dx = a.X - b.X;
        double dy = a.Y - b.Y;
        return (float)Math.Sqrt(dx * dx + dy * dy);
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    private static bool StepEntity(
        ref EntityPosition position,
        EntityPosition     destination,
        int                speedCmPerSec,
        float              deltaSeconds)
    {
        float dx   = destination.X - position.X;
        float dy   = destination.Y - position.Y;
        float dist = MathF.Sqrt(dx * dx + dy * dy);

        if (dist < ARRIVAL_THRESHOLD_CM)
        {
            position = destination;
            return true;  // arrived
        }

        float step = speedCmPerSec * deltaSeconds;

        if (step >= dist)
        {
            position = destination;
            return true;
        }

        float inv = step / dist;
        position.X += (int)(dx * inv);
        position.Y += (int)(dy * inv);
        return false;
    }

    private static uint SetFlag(uint flags, int bit, bool value)
    {
        uint mask = 1u << bit;
        return value ? (flags | mask) : (flags & ~mask);
    }
}
