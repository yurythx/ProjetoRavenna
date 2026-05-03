namespace RavennaServer.Simulation;

/// <summary>
/// Immutable scaling parameters for a named map zone.
/// Multipliers are applied to the base CombatProfile at NPC spawn time.
/// </summary>
internal sealed record ZoneScale(
    string Name,
    int    Level,
    float  HpMult,
    float  DamageMult,
    float  XpMult
);

/// <summary>
/// Registry of all named zones. Zones are referenced by name in spawns.json.
/// Unknown zone names fall back to "plains" (level 1, no scaling).
/// </summary>
internal static class ZoneRegistry
{
    private static readonly Dictionary<string, ZoneScale> _zones = new(StringComparer.OrdinalIgnoreCase)
    {
        ["plains"] = new ZoneScale("plains", Level: 1,  HpMult: 1.0f, DamageMult: 1.0f, XpMult: 1.0f),
        ["forest"] = new ZoneScale("forest", Level: 5,  HpMult: 1.3f, DamageMult: 1.2f, XpMult: 2.0f),
        ["ruins"]  = new ZoneScale("ruins",  Level: 10, HpMult: 1.7f, DamageMult: 1.5f, XpMult: 4.0f),
    };

    public static ZoneScale Get(string? zone) =>
        zone is not null && _zones.TryGetValue(zone, out var z) ? z : _zones["plains"];

    /// <summary>
    /// Return a scaled copy of <paramref name="base"/> adjusted for <paramref name="zone"/>.
    /// All other profile fields (ranges, cooldowns, AoE) are unchanged — only
    /// HP, damage, and XP are multiplied.
    /// </summary>
    public static CombatProfile Scale(CombatProfile @base, ZoneScale zone) => new()
    {
        MaxHp             = Math.Max(1, (int)(@base.MaxHp         * zone.HpMult)),
        AttackDamage      = Math.Max(1, (int)(@base.AttackDamage  * zone.DamageMult)),
        AttackRange       = @base.AttackRange,
        MovementSpeed     = @base.MovementSpeed,
        AttackCooldownSec = @base.AttackCooldownSec,
        AggroRange        = @base.AggroRange,
        XpReward          = Math.Max(0, (int)(@base.XpReward      * zone.XpMult)),
        AoeRadius         = @base.AoeRadius,
        AoeCooldownSec    = @base.AoeCooldownSec,
        AoeDamage         = @base.AoeDamage > 0
                            ? Math.Max(1, (int)(@base.AoeDamage * zone.DamageMult))
                            : 0,
    };
}
