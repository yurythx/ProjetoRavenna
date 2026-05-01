namespace RavennaServer.Simulation;

/// <summary>
/// Targeting type determines how the skill picks its subjects.
/// </summary>
internal enum SkillTargeting
{
    SingleEnemy,   // one enemy within range
    SingleAlly,    // one ally (or self) within range
    Self,          // always targets the caster
    AreaOfEffect,  // all enemies within AoeRadius of the target point
}

/// <summary>
/// Immutable definition of a single skill archetype.
/// skill_id values must match the IDs stored in Django's game_data SkillTemplate.
/// </summary>
internal sealed class SkillDefinition
{
    public uint           SkillId          { get; init; }
    public string         Name             { get; init; } = "";
    public SkillTargeting Targeting        { get; init; }
    public float          DamageMultiplier { get; init; } = 1.0f;  // × AttackDamage
    public int            HealAmount       { get; init; } = 0;      // flat HP restore (for heal skills)
    public int            Range            { get; init; } = 300;    // cm — 0 uses player AttackRange
    public int            AoeRadius        { get; init; } = 0;      // cm, >0 enables AoE
    public float          CooldownSec      { get; init; } = 5.0f;
    public int            ManaCost         { get; init; } = 0;      // reserved — not yet enforced
}

/// <summary>
/// Static registry of all server-side skill definitions.
/// Skill IDs are assigned to match Django's SkillTemplate PKs.
/// In phase 2.4 (NPCs from Django) these will be loaded dynamically at startup.
/// </summary>
internal static class SkillRegistry
{
    private static readonly Dictionary<uint, SkillDefinition> _skills = new()
    {
        // ── Melee skills ──────────────────────────────────────────────────────
        [1] = new SkillDefinition
        {
            SkillId          = 1,
            Name             = "Power Strike",
            Targeting        = SkillTargeting.SingleEnemy,
            DamageMultiplier = 2.5f,
            Range            = 200,
            CooldownSec      = 6f,
        },
        [2] = new SkillDefinition
        {
            SkillId          = 2,
            Name             = "Whirlwind",
            Targeting        = SkillTargeting.AreaOfEffect,
            DamageMultiplier = 1.5f,
            Range            = 0,    // uses player AttackRange
            AoeRadius        = 300,
            CooldownSec      = 10f,
        },

        // ── Ranged skills ─────────────────────────────────────────────────────
        [3] = new SkillDefinition
        {
            SkillId          = 3,
            Name             = "Arrow Rain",
            Targeting        = SkillTargeting.AreaOfEffect,
            DamageMultiplier = 1.2f,
            Range            = 800,
            AoeRadius        = 250,
            CooldownSec      = 12f,
        },
        [4] = new SkillDefinition
        {
            SkillId          = 4,
            Name             = "Piercing Shot",
            Targeting        = SkillTargeting.SingleEnemy,
            DamageMultiplier = 3.0f,
            Range            = 1000,
            CooldownSec      = 8f,
        },

        // ── Magic skills ──────────────────────────────────────────────────────
        [5] = new SkillDefinition
        {
            SkillId          = 5,
            Name             = "Fireball",
            Targeting        = SkillTargeting.AreaOfEffect,
            DamageMultiplier = 2.0f,
            Range            = 700,
            AoeRadius        = 200,
            CooldownSec      = 8f,
        },
        [6] = new SkillDefinition
        {
            SkillId          = 6,
            Name             = "Ice Lance",
            Targeting        = SkillTargeting.SingleEnemy,
            DamageMultiplier = 2.8f,
            Range            = 600,
            CooldownSec      = 5f,
        },

        // ── Support skills ────────────────────────────────────────────────────
        [7] = new SkillDefinition
        {
            SkillId     = 7,
            Name        = "Heal",
            Targeting   = SkillTargeting.Self,
            HealAmount  = 40,
            CooldownSec = 15f,
        },
        [8] = new SkillDefinition
        {
            SkillId     = 8,
            Name        = "Battle Cry",
            Targeting   = SkillTargeting.Self,
            HealAmount  = 0,  // buff — effect TBD in phase 3
            CooldownSec = 20f,
        },
    };

    public static bool TryGet(uint skillId, out SkillDefinition? skill)
        => _skills.TryGetValue(skillId, out skill);

    public static IEnumerable<SkillDefinition> All => _skills.Values;
}
