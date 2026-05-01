namespace RavennaServer.Simulation;

/// <summary>
/// Server-side state machine for each entity.
/// Matches the uint32 combat_state field in the EntityState proto message:
///   0=Idle, 1=Moving, 2=Chasing, 3=Attacking, 4=Dead
/// </summary>
internal enum CombatState : uint
{
    /// <summary>Entity is stationary and has no combat target.</summary>
    Idle      = 0,

    /// <summary>Entity is steering toward a click-to-move destination.</summary>
    Moving    = 1,

    /// <summary>Entity is closing distance to a target (outside AttackRange).</summary>
    Chasing   = 2,

    /// <summary>Entity is within AttackRange and applying damage each cooldown.</summary>
    Attacking = 3,

    /// <summary>HP reached zero — entity cannot act; awaits respawn.</summary>
    Dead      = 4,
}

/// <summary>
/// Combat configuration for a single entity type.
/// Immutable after construction — shared across instances of the same archetype.
/// </summary>
internal sealed class CombatProfile
{
    public int   MaxHp             { get; init; } = 100;
    public int   AttackDamage      { get; init; } = 10;
    public int   AttackRange       { get; init; } = 150;   // cm
    public int   MovementSpeed     { get; init; } = 400;   // cm/s
    public float AttackCooldownSec { get; init; } = 1.0f;
    public int   AggroRange        { get; init; } = 1000;  // cm — NPCs only
    public int   XpReward          { get; init; } = 0;     // NPCs only

    public static readonly CombatProfile DefaultPlayer = new()
    {
        MaxHp             = 100,
        AttackDamage      = 10,
        AttackRange       = 150,
        MovementSpeed     = 400,
        AttackCooldownSec = 1.0f,
    };

    public static readonly CombatProfile WolfNpc = new()
    {
        MaxHp             = 60,
        AttackDamage      = 8,
        AttackRange       = 120,
        MovementSpeed     = 350,
        AttackCooldownSec = 1.5f,
        AggroRange        = 800,
        XpReward          = 25,
    };

    public static readonly CombatProfile BanditNpc = new()
    {
        MaxHp             = 120,
        AttackDamage      = 15,
        AttackRange       = 180,
        MovementSpeed     = 300,
        AttackCooldownSec = 1.2f,
        AggroRange        = 600,
        XpReward          = 50,
    };
}
