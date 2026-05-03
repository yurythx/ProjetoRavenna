"""
Models for game_data app.
Static templates - stores base attributes for items, skills, and maps.
Unity reads these at startup.
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
