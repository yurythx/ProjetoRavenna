"""
Data migration: seed class passives (server_id 101-108) and
racial passives (server_id 201-204).

Effects are stored in level_scaling[0] so they can be rebalanced
without code changes — just update the JSON and reload player state.

Effect keys:
  str, agi, int, vit           — flat attribute bonuses (applied before derived-stat calc)
  max_hp_pct, max_mana_pct     — % increase to MaxHP / MaxMana after base calc
  phys_damage_pct, mag_damage_pct    — % increase to PhysicalDamage / MagicalDamage
  phys_defense_pct, mag_defense_pct  — % increase to PhysDefense / MagDefense
  move_speed_pct               — % increase to MoveSpeed
  attack_range_pct             — % increase to AttackRange
"""
from django.db import migrations

_CLASS_PASSIVES = [
    {
        "id":               "b0000000-0000-0000-0000-000000000101",
        "name":             "Bastião Sagrado",
        "description":      "A proteção divina do Paladino fortalece corpo e espírito.",
        "server_id":        101,
        "class_restriction": "paladino",
        "level_scaling":    [{"vit": 10, "max_hp_pct": 10, "mag_defense_pct": 10}],
    },
    {
        "id":               "b0000000-0000-0000-0000-000000000102",
        "name":             "Escamas Dracônicas",
        "description":      "O sangue dracônico endurece a pele do Cavaleiro Dragão.",
        "server_id":        102,
        "class_restriction": "cavaleiro_dragao",
        "level_scaling":    [{"str": 8, "vit": 8, "phys_defense_pct": 15}],
    },
    {
        "id":               "b0000000-0000-0000-0000-000000000103",
        "name":             "Maestria Arcana",
        "description":      "Controle absoluto das energias mágicas amplifica cada feitiço.",
        "server_id":        103,
        "class_restriction": "mage",
        "level_scaling":    [{"int": 10, "mag_damage_pct": 15}],
    },
    {
        "id":               "b0000000-0000-0000-0000-000000000104",
        "name":             "Graça da Floresta",
        "description":      "A harmonia com a natureza afia tanto corpo quanto mente.",
        "server_id":        104,
        "class_restriction": "eldari",
        "level_scaling":    [{"int": 6, "agi": 6, "mag_damage_pct": 15}],
    },
    {
        "id":               "b0000000-0000-0000-0000-000000000105",
        "name":             "Chama Eterna",
        "description":      "O fogo interior do Ignis arde sem cessar, acelerando seus passos.",
        "server_id":        105,
        "class_restriction": "ignis",
        "level_scaling":    [{"int": 8, "mag_damage_pct": 20, "move_speed_pct": 5}],
    },
    {
        "id":               "b0000000-0000-0000-0000-000000000106",
        "name":             "Pacto das Trevas",
        "description":      "O contrato com forças sombrias expande o reservatório de mana.",
        "server_id":        106,
        "class_restriction": "necromante",
        "level_scaling":    [{"int": 8, "mag_damage_pct": 10, "max_mana_pct": 15}],
    },
    {
        "id":               "b0000000-0000-0000-0000-000000000107",
        "name":             "Olho de Falcão",
        "description":      "Visão aguçada estende o alcance e a precisão de cada disparo.",
        "server_id":        107,
        "class_restriction": "archer",
        "level_scaling":    [{"agi": 8, "phys_damage_pct": 10, "attack_range_pct": 25}],
    },
    {
        "id":               "b0000000-0000-0000-0000-000000000108",
        "name":             "Sombra",
        "description":      "Movimento silencioso e golpes precisos definem o Shadow.",
        "server_id":        108,
        "class_restriction": "shadow",
        "level_scaling":    [{"agi": 10, "phys_damage_pct": 15, "move_speed_pct": 10}],
    },
]

_RACIAL_PASSIVES = [
    {
        "id":            "c0000000-0000-0000-0000-000000000201",
        "name":          "Adaptabilidade",
        "description":   "A versatilidade humana eleva todos os atributos.",
        "server_id":     201,
        "level_scaling": [{"str": 3, "agi": 3, "int": 3, "vit": 3}],
    },
    {
        "id":            "c0000000-0000-0000-0000-000000000202",
        "name":          "Afinidade Arcana",
        "description":   "Os elfos nascem com laço natural com as energias mágicas.",
        "server_id":     202,
        "level_scaling": [{"int": 5, "agi": 5, "mag_damage_pct": 10}],
    },
    {
        "id":            "c0000000-0000-0000-0000-000000000203",
        "name":          "Herança Dracônica",
        "description":   "Sangue dracônico amplifica força e resistência física.",
        "server_id":     203,
        "level_scaling": [{"str": 8, "phys_damage_pct": 10, "phys_defense_pct": 5}],
    },
    {
        "id":            "c0000000-0000-0000-0000-000000000204",
        "name":          "Resiliência Sombria",
        "description":   "Séculos nas trevas tornaram o Morto-Vivo resistente à magia.",
        "server_id":     204,
        "level_scaling": [{"vit": 5, "mag_defense_pct": 10, "max_hp_pct": 5}],
    },
]


def seed_passives(apps, schema_editor):
    SkillTemplate = apps.get_model("game_data", "SkillTemplate")
    for p in _CLASS_PASSIVES:
        SkillTemplate.objects.update_or_create(
            id=p["id"],
            defaults={
                "name":              p["name"],
                "description":       p["description"],
                "skill_type":        "passive",
                "damage":            0,
                "healing":           0,
                "mana_cost":         0,
                "cooldown":          0.0,
                "range":             0.0,
                "cast_time":         0.0,
                "server_id":         p["server_id"],
                "is_passive":        True,
                "is_racial_passive": False,
                "class_restriction": p["class_restriction"],
                "level_scaling":     p["level_scaling"],
            },
        )
    for p in _RACIAL_PASSIVES:
        SkillTemplate.objects.update_or_create(
            id=p["id"],
            defaults={
                "name":              p["name"],
                "description":       p["description"],
                "skill_type":        "passive",
                "damage":            0,
                "healing":           0,
                "mana_cost":         0,
                "cooldown":          0.0,
                "range":             0.0,
                "cast_time":         0.0,
                "server_id":         p["server_id"],
                "is_passive":        False,
                "is_racial_passive": True,
                "class_restriction": "",
                "level_scaling":     p["level_scaling"],
            },
        )


def unseed_passives(apps, schema_editor):
    SkillTemplate = apps.get_model("game_data", "SkillTemplate")
    all_ids = [p["id"] for p in _CLASS_PASSIVES] + [p["id"] for p in _RACIAL_PASSIVES]
    SkillTemplate.objects.filter(id__in=all_ids).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("game_data", "0005_seed_skill_templates"),
    ]

    operations = [
        migrations.RunPython(seed_passives, reverse_code=unseed_passives),
    ]
