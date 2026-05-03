namespace RavennaServer.Simulation;

/// <summary>
/// Classifies what a buff or debuff modifies.
/// Values are encoded in S2C_EffectApplied.effect_type on the wire.
/// </summary>
internal enum EffectType : uint
{
    DamageBoostPct         = 0,  // attacker deals N% more damage
    DefenseBoostPct        = 1,  // target takes N% less damage
    SpeedBoostPct          = 2,  // entity moves N% faster
    AttackSpeedBoostPct    = 3,  // entity attacks N% faster (reduces cooldown)
    DamageTakenIncreasePct = 4,  // (debuff) entity takes N% more incoming damage
    SlowPct                = 5,  // (debuff) entity moves N% slower
}

/// <summary>
/// Single active buff or debuff on an entity.
/// Stored in a <see cref="PlayerSession.ActiveEffects"/> list.
/// Value is always positive; EffectType encodes direction (boost vs. penalty).
/// </summary>
internal readonly struct ActiveEffect
{
    public readonly EffectType EffectType;
    public readonly int        Value;        // magnitude in percent
    public readonly long       ExpiresAtMs;  // Environment.TickCount64 deadline
    public readonly uint       SourceId;     // conv_id of the caster (0 = environment)

    public ActiveEffect(EffectType type, int value, long expiresAtMs, uint sourceId)
    {
        EffectType  = type;
        Value       = value;
        ExpiresAtMs = expiresAtMs;
        SourceId    = sourceId;
    }

    public bool IsActive(long nowMs) => nowMs < ExpiresAtMs;
}
