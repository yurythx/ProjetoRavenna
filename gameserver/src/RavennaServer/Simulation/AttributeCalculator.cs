// =============================================================================
// AttributeCalculator.cs — Fórmulas de stats derivados do personagem
// =============================================================================
//
// Centraliza TODAS as fórmulas de derivação de atributos. Alterar uma fórmula
// aqui afeta todos os jogadores e NPCs automaticamente.
//
// Fluxo de cálculo no handshake (UdpSocketListener):
//   base_attr = Django (strength/agility/intelligence/vitality)
//   eff_attr  = base_attr + passive_flat_bonuses  ← aplicado ANTES
//   derived   = AttributeCalculator.*(eff_attr, equipment_bonus)
//   derived   = derived * (1 + passive_pct / 100)  ← aplicado DEPOIS
//
// Fórmulas:
//   PhysicalDamage(str, agi, equip)  = 10 + str×2 + agi×0.5 + equip
//   MagicalDamage(int, equip)        = 10 + int×2.5 + equip
//   PhysDefense(vit, equip)          = 20 + vit×3 + equip
//   MagDefense(vit, int, equip)      = 10 + vit×2 + int + equip
//   MaxHp(vit, equip)                = 100 + vit×15 + equip
//   MaxMana(int, equip)              = 50 + int×10 + equip
//   AttackCooldown(agi, equip)       = clamp(1.0×(1 - agi/200) + equip, 0.3s, 3.0s)
//   MoveSpeed(agi, equip)            = 400 + agi×2 + equip  (cm/s)
//
// Mitigação de dano (fórmula diminishing returns):
//   Mitigation(def) = def / (def + 150)
//   → 150 def = 50%  300 def = 67%  600 def = 80%
//   ApplyMitigation(rawDmg, def) = max(1, rawDmg × (1 - mitigation))
//
// DamageMode-aware (PvP):
//   Physical → ApplyMitigation(physDmg, targetPhysDef)
//   Magical  → ApplyMitigation(magDmg,  targetMagDef)
//   Hybrid   → ambos somados com mitigação separada por componente
//
// Sincronização com o cliente Unity:
//   O cliente deve replicar estas fórmulas para exibir stats estimados no UI.
//   O servidor é autoritativo — valores do servidor sempre prevalecem.
// =============================================================================
namespace RavennaServer.Simulation;

/// <summary>
/// Centralises all stat formulas so they can be changed in one place.
/// All methods are pure — no side effects, no heap allocation.
///
/// ── Equipment bonus flow ──────────────────────────────────────────────────────
///
///   Django's get_equipment_bonuses() sums base_phys_damage, base_mag_damage,
///   base_phys_defense, base_mag_defense across ALL equipped slots
///   (weapon + offhand + helmet + chest + gloves + boots + rings + amulet).
///
///   Shields contribute both base_phys_defense AND base_mag_defense —
///   a magical shield can boost MagDefense significantly.
///
///   Hybrid weapons (mace, hammer, lance) carry both base_phys_damage and
///   base_mag_damage, so both PhysicalDamage and MagicalDamage receive bonuses.
///
///   Shadow dual wield: both weapons' base_phys_damage sum into PhysicalDamage.
///
///   Armor weight effects are encoded in the item's base_speed bonus:
///   heavy armor has negative base_speed, reducing MoveSpeed below the base.
/// </summary>
internal static class AttributeCalculator
{
    // ── Damage ────────────────────────────────────────────────────────────────

    /// <summary>Physical damage for STR/AGI classes and hybrid-weapon tanks.</summary>
    public static int PhysicalDamage(int str, int agi, int equipBonus) =>
        10 + str * 2 + (int)(agi * 0.5f) + equipBonus;

    /// <summary>Magical damage for INT classes and hybrid-weapon tanks.</summary>
    public static int MagicalDamage(int intelligence, int equipBonus) =>
        10 + (int)(intelligence * 2.5f) + equipBonus;

    // ── Defense ───────────────────────────────────────────────────────────────

    /// <summary>Physical defense — VIT + armor + shield base_phys_defense.</summary>
    public static int PhysDefense(int vit, int equipBonus) =>
        20 + vit * 3 + equipBonus;

    /// <summary>
    /// Magical defense — VIT + INT + armor + shield base_mag_defense.
    /// Magical shields (high base_mag_defense) make tanks significantly more
    /// resistant to magic even with low INT.
    /// </summary>
    public static int MagDefense(int vit, int intelligence, int equipBonus) =>
        10 + vit * 2 + intelligence + equipBonus;

    // ── Vitals ────────────────────────────────────────────────────────────────

    public static int MaxHp(int vit, int equipBonus) =>
        100 + vit * 15 + equipBonus;

    public static int MaxMana(int intelligence, int equipBonus) =>
        50 + intelligence * 10 + equipBonus;

    // ── Speed ─────────────────────────────────────────────────────────────────

    /// <summary>
    /// Attack cooldown in seconds. Heavy armor can penalise via negative
    /// equipAtkSpeedBonus (set in the item's base_attack_speed field).
    /// </summary>
    public static float AttackCooldown(int agi, float equipAtkSpeedBonus) =>
        Math.Clamp(1.0f * (1f - agi / 200f) + equipAtkSpeedBonus, 0.3f, 3.0f);

    /// <summary>Movement speed cm/s. Heavy armor uses negative base_speed on items.</summary>
    public static int MoveSpeed(int agi, int equipBonus) =>
        400 + agi * 2 + equipBonus;

    // ── Mitigation ────────────────────────────────────────────────────────────

    /// <summary>
    /// Damage reduction ratio (0–1). Formula: D / (D + 150).
    ///   defense=150 → 50 %   defense=300 → 67 %   defense=600 → 80 %
    /// </summary>
    public static float Mitigation(int defense) =>
        defense / (defense + 150f);

    /// <summary>Apply mitigation and return final integer damage (minimum 1).</summary>
    public static int ApplyMitigation(int rawDamage, int defense)
    {
        if (defense <= 0) return rawDamage;
        return Math.Max(1, (int)(rawDamage * (1f - Mitigation(defense))));
    }

    // ── Damage-mode–aware combat resolution ──────────────────────────────────

    /// <summary>
    /// Resolve final post-mitigation damage for a player auto-attack against
    /// another player, respecting the attacker's DamageMode.
    ///
    ///   Physical → ApplyMitigation(physDamage,  targetPhysDef)
    ///   Magical  → ApplyMitigation(magDamage,   targetMagDef)
    ///   Hybrid   → ApplyMitigation(physDamage,  targetPhysDef)
    ///            + ApplyMitigation(magDamage,   targetMagDef)
    ///
    /// Used for both auto-attacks and skill hits in PvP.
    /// </summary>
    public static int ApplyDamage(
        DamageMode mode,
        int physDamage, int magDamage,
        int targetPhysDef, int targetMagDef) =>
        mode switch
        {
            DamageMode.Magical => ApplyMitigation(magDamage,  targetMagDef),
            DamageMode.Hybrid  => ApplyMitigation(physDamage, targetPhysDef)
                                + ApplyMitigation(magDamage,  targetMagDef),
            _                  => ApplyMitigation(physDamage, targetPhysDef),
        };

    /// <summary>
    /// Infer DamageMode from the player's class and equipment bonuses.
    ///   Magic class              → Magical
    ///   Phys class, mag bonus>0  → Hybrid  (e.g. tank with lance)
    ///   Phys class, no mag bonus → Physical
    /// </summary>
    public static DamageMode InferDamageMode(CharacterClass cls, int equipMagDamageBonus) =>
        CharacterClassHelper.IsMagicClass(cls) ? DamageMode.Magical
        : equipMagDamageBonus > 0              ? DamageMode.Hybrid
                                               : DamageMode.Physical;
}
