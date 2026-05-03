from django.db import migrations


ELITE_ITEMS = [
    {
        "id":        "d0000000-0000-0000-0000-000000000005",
        "name":      "Elite Wolf Pelt",
        "item_type": "material",
        "rarity":    "uncommon",
        "stack_size": 20,
        "description": "A thick pelt from a fearsome elite wolf.",
    },
    {
        "id":        "d0000000-0000-0000-0000-000000000006",
        "name":      "Captain's Axe",
        "item_type": "weapon",
        "rarity":    "rare",
        "stack_size": 1,
        "weapon_type": "axe",
        "base_phys_damage": 22,
        "description": "A heavy axe wielded by the bandit captain.",
    },
]


def seed_elite_items(apps, schema_editor):
    ItemTemplate = apps.get_model("game_data", "ItemTemplate")
    for data in ELITE_ITEMS:
        ItemTemplate.objects.update_or_create(id=data["id"], defaults=data)


def unseed_elite_items(apps, schema_editor):
    ItemTemplate = apps.get_model("game_data", "ItemTemplate")
    for data in ELITE_ITEMS:
        ItemTemplate.objects.filter(id=data["id"]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("game_data", "0007_seed_loot_item_templates"),
    ]

    operations = [
        migrations.RunPython(seed_elite_items, unseed_elite_items),
    ]
