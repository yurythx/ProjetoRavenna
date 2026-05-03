"""
Data migration: seed the 8 base SkillTemplates whose server_id values mirror
the C# SkillRegistry.  IDs are fixed UUIDs so re-running is idempotent.
"""
from django.db import migrations

_SKILLS = [
    {
        "id":          "a0000000-0000-0000-0000-000000000001",
        "name":        "Power Strike",
        "description": "Melee strike that deals 250% physical damage to a single target.",
        "skill_type":  "melee",
        "mana_cost":   15,
        "cooldown":    6.0,
        "range":       200.0,
        "server_id":   1,
    },
    {
        "id":          "a0000000-0000-0000-0000-000000000002",
        "name":        "Whirlwind",
        "description": "Spin attack dealing 150% physical damage to all enemies within 300 cm.",
        "skill_type":  "melee",
        "mana_cost":   25,
        "cooldown":    10.0,
        "range":       0.0,
        "server_id":   2,
    },
    {
        "id":          "a0000000-0000-0000-0000-000000000003",
        "name":        "Arrow Rain",
        "description": "Volley of arrows dealing 120% damage to all enemies in a 250 cm area.",
        "skill_type":  "ranged",
        "mana_cost":   20,
        "cooldown":    12.0,
        "range":       800.0,
        "server_id":   3,
    },
    {
        "id":          "a0000000-0000-0000-0000-000000000004",
        "name":        "Piercing Shot",
        "description": "A precise arrow dealing 300% physical damage to a single distant target.",
        "skill_type":  "ranged",
        "mana_cost":   18,
        "cooldown":    8.0,
        "range":       1000.0,
        "server_id":   4,
    },
    {
        "id":          "a0000000-0000-0000-0000-000000000005",
        "name":        "Fireball",
        "description": "Explosive fireball dealing 200% magical damage in a 200 cm radius.",
        "skill_type":  "magic",
        "mana_cost":   30,
        "cooldown":    8.0,
        "range":       700.0,
        "server_id":   5,
    },
    {
        "id":          "a0000000-0000-0000-0000-000000000006",
        "name":        "Ice Lance",
        "description": "Shard of ice dealing 280% magical damage to a single target.",
        "skill_type":  "magic",
        "mana_cost":   22,
        "cooldown":    5.0,
        "range":       600.0,
        "server_id":   6,
    },
    {
        "id":          "a0000000-0000-0000-0000-000000000007",
        "name":        "Heal",
        "description": "Restores 40 HP to self.",
        "skill_type":  "support",
        "healing":     40,
        "mana_cost":   35,
        "cooldown":    15.0,
        "range":       0.0,
        "server_id":   7,
    },
    {
        "id":          "a0000000-0000-0000-0000-000000000008",
        "name":        "Battle Cry",
        "description": "A war cry that temporarily boosts the caster (effect applied in Phase 3).",
        "skill_type":  "support",
        "mana_cost":   20,
        "cooldown":    20.0,
        "range":       0.0,
        "server_id":   8,
    },
]


def seed_skills(apps, schema_editor):
    SkillTemplate = apps.get_model("game_data", "SkillTemplate")
    for s in _SKILLS:
        SkillTemplate.objects.update_or_create(
            id=s["id"],
            defaults={
                "name":               s["name"],
                "description":        s.get("description", ""),
                "skill_type":         s["skill_type"],
                "damage":             s.get("damage", 0),
                "healing":            s.get("healing", 0),
                "mana_cost":          s["mana_cost"],
                "cooldown":           s["cooldown"],
                "range":              s["range"],
                "cast_time":          0.0,
                "server_id":          s["server_id"],
                "is_passive":         False,
                "is_racial_passive":  False,
                "class_restriction":  "",
                "level_scaling":      [],
            },
        )


def unseed_skills(apps, schema_editor):
    SkillTemplate = apps.get_model("game_data", "SkillTemplate")
    SkillTemplate.objects.filter(id__in=[s["id"] for s in _SKILLS]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("game_data", "0004_itemtemplate_is_two_handed_weapon_types"),
    ]

    operations = [
        migrations.RunPython(seed_skills, reverse_code=unseed_skills),
    ]
