"""
Models for game_data app.
Static templates - stores base attributes for items, skills, and maps.
Unity reads these at startup.
"""
from django.db import models

from apps.common.models import UUIDModel


class ItemTemplate(UUIDModel):
    """Base template for all items in the game."""

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    item_type = models.CharField(max_length=50)
    rarity = models.CharField(max_length=20, default="common")
    base_damage = models.IntegerField(default=0)
    base_defense = models.IntegerField(default=0)
    base_health = models.IntegerField(default=0)
    base_mana = models.IntegerField(default=0)
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
