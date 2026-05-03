"""
Data migration: seed consumable/drop item templates used by the C# loot system.

Fixed UUIDs (prefix d000…) let the game server reference items by a stable
identifier without storing Django UUIDs in C# code — the LootTable in C# uses
these same UUIDs as string constants.

Item-type conventions:
  material   — crafting ingredient, no equip slot
  consumable — single-use item, no equip slot
  currency   — stackable currency, no equip slot
  weapon     — equippable weapon (uses equip_slot + weapon_type)
"""
from django.db import migrations

_LOOT_ITEMS = [
    {
        "id":          "d0000000-0000-0000-0000-000000000001",
        "name":        "wolf_pelt",
        "description": "Pelagem espessa de um lobo. Usada em confecção de armaduras.",
        "item_type":   "material",
        "rarity":      "common",
        "stack_size":  20,
        "price":       5,
    },
    {
        "id":          "d0000000-0000-0000-0000-000000000002",
        "name":        "wolf_fang",
        "description": "Presa afiada de um lobo. Componente de crafting.",
        "item_type":   "material",
        "rarity":      "uncommon",
        "stack_size":  10,
        "price":       12,
    },
    {
        "id":          "d0000000-0000-0000-0000-000000000003",
        "name":        "copper_coin",
        "description": "Moeda de cobre comum. Aceita por comerciantes.",
        "item_type":   "currency",
        "rarity":      "common",
        "stack_size":  9999,
        "price":       1,
    },
    {
        "id":          "d0000000-0000-0000-0000-000000000004",
        "name":        "bandit_dagger",
        "description": "Adaga enferrujada deixada por um bandido. Ainda corta.",
        "item_type":   "weapon",
        "rarity":      "common",
        "stack_size":  1,
        "price":       20,
        "equip_slot":  "weapon",
        "weapon_type": "dagger",
        "base_phys_damage": 8,
        "is_droppable": True,
        "is_tradable":  True,
        "level_required": 1,
    },
]

_DEFAULTS = {
    "description":      "",
    "rarity":           "common",
    "base_phys_damage": 0,
    "base_mag_damage":  0,
    "base_phys_defense":0,
    "base_mag_defense": 0,
    "base_health":      0,
    "base_mana":        0,
    "base_attack_speed":0.0,
    "base_speed":       0,
    "equip_slot":       "",
    "weapon_type":      "",
    "armor_type":       "",
    "is_two_handed":    False,
    "icon_path":        "",
    "model_path":       "",
    "stack_size":       1,
    "is_droppable":     True,
    "is_tradable":      True,
    "price":            0,
    "level_required":   1,
}


def seed_loot_items(apps, schema_editor):
    ItemTemplate = apps.get_model("game_data", "ItemTemplate")
    for item in _LOOT_ITEMS:
        defaults = {**_DEFAULTS, **{k: v for k, v in item.items() if k not in ("id", "name")}}
        ItemTemplate.objects.update_or_create(
            id=item["id"],
            defaults={"name": item["name"], **defaults},
        )


def unseed_loot_items(apps, schema_editor):
    ItemTemplate = apps.get_model("game_data", "ItemTemplate")
    ItemTemplate.objects.filter(id__in=[i["id"] for i in _LOOT_ITEMS]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("game_data", "0006_seed_passive_skill_templates"),
    ]

    operations = [
        migrations.RunPython(seed_loot_items, reverse_code=unseed_loot_items),
    ]
