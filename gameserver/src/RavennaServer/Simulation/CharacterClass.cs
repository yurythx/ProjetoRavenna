namespace RavennaServer.Simulation;

/// <summary>
/// Class definitions with weapon/armor rules:
///
///  Class              Faction    Race        Weapons            Armor    Offhand
///  ─────────────────────────────────────────────────────────────────────────────
///  Paladino           Vanguarda  Humano      Sword / Mace       Heavy    Shield
///  Mage               Vanguarda  Humano      Staff (2H)         Light    —
///  Archer             Vanguarda  Elfo        Bow (2H)           Medium   —
///  Eldari             Vanguarda  Elfo        Staff (2H)         Light    —
///  Cavaleiro Dragao   Legiao     Draconato   Sword / Mace       Heavy    Shield
///  Ignis              Legiao     Draconato   Staff / Wand (2H)  Light    —
///  Shadow             Legiao     Morto-Vivo  Sword / Dagger     Medium   Dual Wield
///  Necromante         Legiao     Morto-Vivo  Staff / Wand       Light    —
/// </summary>
internal enum CharacterClass
{
    None            = 0,
    // ── Vanguarda da Alvorada ─────────────────────────────────────────────────
    Paladino        = 1,   // Tank/Hybrid — STR 18 AGI 8  INT 8  VIT 14
    Mage            = 2,   // Magic DPS   — STR 6  AGI 8  INT 20 VIT 14
    Archer          = 3,   // Phys DPS    — STR 10 AGI 20 INT 8  VIT 10
    Eldari          = 4,   // Magic DPS   — STR 6  AGI 10 INT 20 VIT 12
    // ── Legião do Eclipse ─────────────────────────────────────────────────────
    CavaleiroDragao = 5,   // Tank        — STR 16 AGI 6  INT 8  VIT 18
    Ignis           = 6,   // Magic DPS   — STR 6  AGI 8  INT 22 VIT 12
    Shadow          = 7,   // Phys DPS    — STR 12 AGI 20 INT 6  VIT 10
    Necromante      = 8,   // Magic DPS   — STR 6  AGI 10 INT 18 VIT 14
}

internal static class CharacterClassHelper
{
    /// <summary>Returns true for classes whose primary damage scales with INT.</summary>
    public static bool IsMagicClass(CharacterClass cls) => cls switch
    {
        CharacterClass.Mage            => true,
        CharacterClass.Eldari          => true,
        CharacterClass.Ignis           => true,
        CharacterClass.Necromante      => true,
        _                              => false,
    };

    /// <summary>Shadow can equip a weapon in the offhand slot (dual wield).</summary>
    public static bool CanDualWield(CharacterClass cls) =>
        cls == CharacterClass.Shadow;

    /// <summary>Paladino and CavaleiroDragao can equip a shield in the offhand slot.</summary>
    public static bool CanUseShield(CharacterClass cls) =>
        cls == CharacterClass.Paladino || cls == CharacterClass.CavaleiroDragao;
}
