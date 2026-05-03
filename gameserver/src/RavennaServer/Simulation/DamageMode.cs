namespace RavennaServer.Simulation;

/// <summary>
/// Describes how a player's auto-attack and skills deal damage.
///
///   Physical — damage comes purely from STR/AGI (sword, dagger, bow).
///              Mitigated by target's PhysDefense only.
///
///   Magical  — damage comes purely from INT (staff, wand).
///              Mitigated by target's MagDefense only.
///
///   Hybrid   — weapon carries both base_phys_damage and base_mag_damage
///              (mace, hammer, lance — typically tank 2H weapons).
///              Both PhysicalDamage and MagicalDamage are applied;
///              each component is mitigated by its respective defense.
///
/// Determined at handshake by inspecting class + equipment_bonuses.mag_damage.
/// </summary>
internal enum DamageMode
{
    Physical = 0,
    Magical  = 1,
    Hybrid   = 2,
}
