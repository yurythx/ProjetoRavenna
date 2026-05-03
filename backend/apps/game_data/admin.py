"""
Admin configuration for game_data app.
"""
from django.contrib import admin

from apps.game_data.models import ItemTemplate, MapData, SkillTemplate


@admin.register(ItemTemplate)
class ItemTemplateAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "item_type",
        "rarity",
        "base_phys_damage",
        "base_mag_damage",
        "base_phys_defense",
        "base_mag_defense",
        "price",
        "level_required",
    ]
    list_filter = ["item_type", "rarity", "is_droppable", "is_tradable"]
    search_fields = ["name", "description"]


@admin.register(SkillTemplate)
class SkillTemplateAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "skill_type",
        "damage",
        "healing",
        "mana_cost",
        "cooldown",
        "level_required",
    ]
    list_filter = ["skill_type", "level_required"]
    search_fields = ["name", "description"]


@admin.register(MapData)
class MapDataAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "map_key",
        "min_level",
        "max_level",
        "max_players",
        "is_pvp_enabled",
        "is_enabled",
    ]
    list_filter = ["is_pvp_enabled", "is_enabled", "environment"]
    search_fields = ["name", "map_key", "description"]
