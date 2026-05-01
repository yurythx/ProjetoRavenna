namespace RavennaServer.Simulation;

/// <summary>
/// Lightweight NPC instance managed entirely in server memory.
/// Uses the same EntityPosition struct as PlayerSession for grid compatibility.
/// Entity IDs for NPCs start at NpcManager.NPC_ID_BASE to avoid collision
/// with player ConvIds (which start at 1 and are uint).
/// </summary>
internal sealed class NpcEntity
{
    // ── Identity ──────────────────────────────────────────────────────────────
    public readonly uint   EntityId;
    public readonly string NpcType;    // "wolf", "bandit", etc.

    // ── Position & movement ───────────────────────────────────────────────────
    public EntityPosition Position;
    public EntityPosition SpawnPoint;   // returned to after reset / patrol origin
    public EntityPosition Destination;
    public bool           IsMoving;
    public int            MovementSpeed;

    // ── Combat ────────────────────────────────────────────────────────────────
    public int         CurrentHp;
    public int         MaxHp;
    public int         AttackDamage;
    public int         AttackRange;
    public float       AttackCooldownSec;
    public CombatState State;             // current state-machine state
    public uint        CombatTargetId;   // ConvId of the player being attacked (0 = none)
    public long        LastAttackMs;

    // ── AI ────────────────────────────────────────────────────────────────────
    public int  AggroRange;    // cm radius to detect players and switch to Chasing
    public int  XpReward;      // XP sent to killer via Django webhook
    public long DeathTimeMs;   // timestamp at death, used to calculate respawn
    public int  RespawnDelayMs = 15_000;  // 15 s default

    // ── Flags (same bit layout as EntityState proto) ──────────────────────────
    // bit0=moving, bit1=attacking, bit2=dead, bit3=npc
    public uint Flags;

    public bool IsDead     => State == CombatState.Dead;
    public bool IsInCombat => State == CombatState.Chasing || State == CombatState.Attacking;

    public NpcEntity(uint entityId, string npcType, EntityPosition spawnPoint, CombatProfile profile)
    {
        EntityId      = entityId;
        NpcType       = npcType;
        SpawnPoint    = spawnPoint;
        Position      = spawnPoint;
        MovementSpeed = profile.MovementSpeed;
        MaxHp         = profile.MaxHp;
        CurrentHp     = profile.MaxHp;
        AttackDamage  = profile.AttackDamage;
        AttackRange   = profile.AttackRange;
        AttackCooldownSec = profile.AttackCooldownSec;
        AggroRange    = profile.AggroRange;
        XpReward      = profile.XpReward;
        State         = CombatState.Idle;
        Flags         = 0b1000u;  // bit3=npc always set
    }

    /// <summary>Reset to full health at spawn point. Called after respawn delay.</summary>
    public void Respawn()
    {
        Position    = SpawnPoint;
        CurrentHp   = MaxHp;
        State = CombatState.Idle;
        CombatTargetId = 0;
        IsMoving    = false;
        Flags       = 0b1000u;  // npc bit, clear dead/attacking/moving
    }
}
