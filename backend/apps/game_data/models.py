"""
Models do app game_data — dados estáticos do jogo lidos pelo Unity na inicialização.

Este módulo define os templates que servem como "definições" imutáveis durante
o jogo. São criados e editados exclusivamente pelo staff via Django Admin,
e consumidos em tempo real pelo servidor Unity e pelo frontend.

## Modelos

### ItemTemplate
Define um tipo de item: arma, armadura, consumível, etc.
Cada `PlayerItem` no inventário referencia um `ItemTemplate`.

**Campos importantes:**
- `equip_slot` — em qual slot o item é equipado (`weapon`, `chest`, `ring`, etc.)
- `weapon_type` — tipo de arma para restrição por classe (`sword`, `staff`, `bow`, etc.)
- `armor_type` — tipo de armadura para restrição por classe (`light`, `medium`, `heavy`)
- `is_two_handed` — se `True`, ocupa `weapon` + `offhand` ao equipar
- `base_phys_damage` / `base_mag_damage` — dano base (físico e mágico)
- `base_phys_defense` / `base_mag_defense` — defesa base
- `level_scaling` — não usado aqui (está em SkillTemplate)
- `stack_size` — itens com `stack_size > 1` podem ser empilhados no inventário
- `rarity` — `common | uncommon | rare | epic | legendary` (cor na UI)

**Restrição por Classe (validada no service):**
| Armor Type | Classes |
|------------|---------|
| light      | mage, eldari, ignis, necromante |
| medium     | archer, shadow |
| heavy      | paladino, cavaleiro_dragao |

---

### SkillTemplate
Define uma habilidade: tipo, dano, cura, custo de mana, cooldown.
Cada `PlayerSkill` referencia um `SkillTemplate`.

**Campos importantes:**
- `server_id` — ID inteiro que espelha o `uint` no `SkillRegistry` do C# Unity
- `class_restriction` — vazio = disponível para todos; ex.: `"paladino"`
- `is_passive` / `is_racial_passive` — não consome mana, aplica passivamente
- `level_scaling` — lista JSON de overrides por nível:
  ```json
  [{"damage": 20, "mana_cost": 10}, {"damage": 35, "mana_cost": 12}]
  ```
  Índice 0 = nível 1, índice 1 = nível 2, etc.

---

### MapData
Define um mapa/zona do jogo com spawn points, NPCs, monstros e recursos.

**Campos importantes:**
- `map_key` — identificador único do mapa no Unity (ex.: `"ruins"`, `"castle"`)
- `min_level` / `max_level` — faixa de nível recomendada para a zona
- `spawn_points` — lista JSON de posições `[{"x": 0, "y": 0, "z": 0}]`
- `npcs` / `monsters` / `resources` — listas JSON com dados de spawn
- `is_pvp_enabled` — se `True`, permite PvP nessa zona
- `max_players` — limite de jogadores simultâneos na zona

## Como Usar (admin)
Todos os modelos são acessíveis em `/admin/game_data/`.
O Unity consome esses dados via:
- `GET /api/v1/game-data/items/` — lista de ItemTemplates
- `GET /api/v1/game-data/skills/` — lista de SkillTemplates
- `GET /api/v1/game-data/maps/` — lista de MapData

## Observações
- Nunca edite `server_id` de `SkillTemplate` em produção sem atualizar o C# `SkillRegistry`.
- `map_key` deve bater exatamente com o nome do cena no Unity (case-sensitive).
"""
from django.db import models

from apps.common.models import UUIDModel


class ItemTemplate(UUIDModel):
    """Base template for all items in the game."""

    EQUIP_SLOTS = [
        ("weapon",  "Weapon (Main Hand)"),
        ("offhand", "Off-Hand (Shield / Dual Wield)"),
        ("helmet",  "Helmet"),
        ("chest",   "Chest"),
        ("gloves",  "Gloves"),
        ("boots",   "Boots"),
        ("ring",    "Ring"),
        ("amulet",  "Amulet"),
    ]

    WEAPON_TYPES = [
        ("",          "None / Not a Weapon"),
        # ── Magic weapons (base_mag_damage) ──────────────────────────────────
        ("staff",     "Staff"),        # magic classes — 2H
        ("wand",      "Wand"),         # magic classes — 1H or 2H
        # ── Physical weapons (base_phys_damage) ──────────────────────────────
        ("sword",     "Sword"),        # tanks (1H), shadow
        ("dagger",    "Dagger"),       # shadow (dual wield)
        ("bow",       "Bow"),          # archer — 2H
        # ── Hybrid weapons (base_phys_damage + base_mag_damage) ──────────────
        # These deal both types; tanks can use them in weapon slot (2H)
        ("mace",      "Mace"),         # tanks — 1H or 2H; can carry phys+mag damage
        ("hammer",    "Hammer"),       # tanks — 2H; heavy hybrid damage
        ("lance",     "Lance"),        # tanks — 2H; phys+mag hybrid (piercing + magic tip)
        # ── Off-hand only ────────────────────────────────────────────────────
        ("shield",    "Shield"),       # tanks offhand — base_phys_defense + base_mag_defense
    ]

    ARMOR_TYPES = [
        ("",       "None / Not Armor"),
        ("light",  "Light Armor"),   # mage, eldari, ignis, necromante
        ("medium", "Medium Armor"),  # archer, shadow
        ("heavy",  "Heavy Armor"),   # paladino, cavaleiro_dragao
    ]

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    item_type = models.CharField(max_length=50)
    rarity = models.CharField(max_length=20, default="common")
    base_phys_damage = models.IntegerField(default=0)
    base_mag_damage = models.IntegerField(default=0)
    base_phys_defense = models.IntegerField(default=0)
    base_mag_defense = models.IntegerField(default=0)
    base_health = models.IntegerField(default=0)
    base_mana = models.IntegerField(default=0)
    base_attack_speed = models.FloatField(default=0.0)
    base_speed = models.IntegerField(default=0)
    equip_slot = models.CharField(max_length=20, choices=EQUIP_SLOTS, blank=True, default="")
    weapon_type = models.CharField(max_length=20, choices=WEAPON_TYPES, blank=True, default="",
        help_text="Only set for weapons/shields. Drives class restriction validation.")
    armor_type = models.CharField(max_length=20, choices=ARMOR_TYPES, blank=True, default="",
        help_text="Only set for armor pieces. Drives class restriction validation.")
    is_two_handed = models.BooleanField(default=False,
        help_text="True = occupies both weapon + offhand slots. "
                  "Equipping blocks/clears the offhand slot. "
                  "Examples: staff, bow, lance, hammer, 2H mace.")
    icon_path = models.CharField(max_length=255, blank=True)
    model_path = models.CharField(max_length=255, blank=True)
    stack_size = models.IntegerField(default=1)
    is_droppable = models.BooleanField(default=True)
    is_tradable = models.BooleanField(default=True)
    price = models.IntegerField(default=0)
    level_required = models.IntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "item_templates"
        verbose_name = "Item Template"
        verbose_name_plural = "Item Templates"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["item_type", "rarity"]),
            models.Index(fields=["level_required"]),
            models.Index(fields=["equip_slot"]),
            models.Index(fields=["weapon_type"]),
            models.Index(fields=["armor_type"]),
        ]

    def __str__(self):
        return self.name


class SkillTemplate(UUIDModel):
    """Base template for skills."""

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    skill_type = models.CharField(max_length=50)
    damage = models.IntegerField(default=0)
    healing = models.IntegerField(default=0)
    mana_cost = models.IntegerField(default=0)
    cooldown = models.FloatField(default=0.0)
    range = models.FloatField(default=0.0)
    cast_time = models.FloatField(default=0.0)
    icon_path = models.CharField(max_length=255, blank=True)
    animation_path = models.CharField(max_length=255, blank=True)
    level_required = models.IntegerField(default=1)
    # Class / passive metadata
    class_restriction = models.CharField(max_length=50, blank=True, default="",
        help_text="Empty = available to all. E.g. 'paladino', 'mage'.")
    is_passive = models.BooleanField(default=False)
    is_racial_passive = models.BooleanField(default=False)
    # server_id bridges C# SkillRegistry (uint) to this UUID record
    server_id = models.IntegerField(null=True, blank=True, unique=True,
        help_text="Matches the uint skill ID in the C# SkillRegistry. Null = not server-side.")
    # Per-level scaling: list of {damage, heal, mana_cost, ...} overrides indexed by (level - 1)
    level_scaling = models.JSONField(default=list,
        help_text='[{"damage": 20, "mana_cost": 10}, ...] — index 0 = level 1')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "skill_templates"
        verbose_name = "Skill Template"
        verbose_name_plural = "Skill Templates"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["skill_type"]),
            models.Index(fields=["level_required"]),
            models.Index(fields=["class_restriction"]),
        ]

    def __str__(self):
        return self.name


class MapData(UUIDModel):
    """Map and zone data."""

    name = models.CharField(max_length=255)
    map_key = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    min_level = models.IntegerField(default=1)
    max_level = models.IntegerField(default=100)
    max_players = models.IntegerField(default=50)
    environment = models.CharField(max_length=100, blank=True)
    spawn_points = models.JSONField(default=list)
    npcs = models.JSONField(default=list)
    monsters = models.JSONField(default=list)
    resources = models.JSONField(default=list)
    is_pvp_enabled = models.BooleanField(default=False)
    is_enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "map_data"
        verbose_name = "Map"
        verbose_name_plural = "Maps"
        ordering = ["name"]

    def __str__(self):
        return self.name
