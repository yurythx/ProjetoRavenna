namespace RavennaServer.Simulation;

/// <summary>
/// A loot drop resolved by the server: the Django ItemTemplate UUID and quantity.
/// UUID must match a row seeded by game_data/0007_seed_loot_item_templates.py.
/// </summary>
internal readonly struct LootDrop
{
    public readonly string ItemTemplateId;  // Django UUID — sent as item_template_id in webhook
    public readonly int    Quantity;

    public LootDrop(string itemTemplateId, int quantity)
    {
        ItemTemplateId = itemTemplateId;
        Quantity       = quantity;
    }
}

/// <summary>
/// Static loot table: resolves a nullable drop for a given NPC type.
/// Probabilities are checked with Random.Shared (thread-safe since .NET 6).
/// Returns null when nothing drops (the common case — no allocation).
/// </summary>
internal static class LootTable
{
    // ── Django item UUIDs (must match migrations 0007 + 0008) ────────────────
    private const string WOLF_PELT          = "d0000000-0000-0000-0000-000000000001";
    private const string WOLF_FANG          = "d0000000-0000-0000-0000-000000000002";
    private const string COPPER_COIN        = "d0000000-0000-0000-0000-000000000003";
    private const string BANDIT_DAGGER      = "d0000000-0000-0000-0000-000000000004";
    private const string ELITE_WOLF_PELT    = "d0000000-0000-0000-0000-000000000005";  // 0008
    private const string CAPTAIN_AXE        = "d0000000-0000-0000-0000-000000000006";  // 0008

    public static LootDrop? Roll(string npcType) => npcType switch
    {
        "wolf"           => RollWolf(),
        "bandit"         => RollBandit(),
        "elite_wolf"     => RollEliteWolf(),
        "bandit_captain" => RollBanditCaptain(),
        _                => null,
    };

    private static LootDrop? RollWolf()
    {
        int roll = Random.Shared.Next(100);
        if (roll < 60) return new LootDrop(WOLF_PELT,  1);   // 60% pelt
        if (roll < 80) return new LootDrop(WOLF_FANG,  1);   // 20% fang
        return null;                                          // 20% empty
    }

    private static LootDrop? RollBandit()
    {
        int roll = Random.Shared.Next(100);
        if (roll < 50) return new LootDrop(COPPER_COIN,   Random.Shared.Next(5, 16)); // 50% coins 5-15
        if (roll < 80) return new LootDrop(BANDIT_DAGGER, 1);                         // 30% dagger
        return null;                                                                   // 20% empty
    }

    private static LootDrop? RollEliteWolf()
    {
        int roll = Random.Shared.Next(100);
        if (roll < 70) return new LootDrop(ELITE_WOLF_PELT, 1);  // 70% elite pelt (guaranteed drop)
        if (roll < 90) return new LootDrop(WOLF_FANG,       2);  // 20% 2× fangs
        return null;                                              // 10% empty
    }

    private static LootDrop? RollBanditCaptain()
    {
        int roll = Random.Shared.Next(100);
        if (roll < 50) return new LootDrop(CAPTAIN_AXE,  1);                          // 50% boss axe
        if (roll < 90) return new LootDrop(COPPER_COIN,  Random.Shared.Next(20, 51)); // 40% coins 20-50
        return null;                                                                   // 10% empty
    }
}
