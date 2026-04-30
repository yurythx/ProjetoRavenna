"""
Serializers for game_data app.
"""
from rest_framework import serializers

from apps.game_data.models import ItemTemplate, MapData, SkillTemplate


class ItemTemplateSerializer(serializers.ModelSerializer):
    """Serializer for item templates."""

    class Meta:
        model = ItemTemplate
        fields = [
            "id",
            "name",
            "description",
            "item_type",
            "rarity",
            "base_damage",
            "base_defense",
            "base_health",
            "base_mana",
            "icon_path",
            "model_path",
            "stack_size",
            "is_droppable",
            "is_tradable",
            "price",
            "level_required",
            "created_at",
            "updated_at",
        ]


class SkillTemplateSerializer(serializers.ModelSerializer):
    """Serializer for skill templates."""

    class Meta:
        model = SkillTemplate
        fields = [
            "id",
            "name",
            "description",
            "skill_type",
            "damage",
            "healing",
            "mana_cost",
            "cooldown",
            "range",
            "cast_time",
            "icon_path",
            "animation_path",
            "level_required",
            "created_at",
            "updated_at",
        ]


class MapDataSerializer(serializers.ModelSerializer):
    """Serializer for map data."""

    class Meta:
        model = MapData
        fields = [
            "id",
            "name",
            "map_key",
            "description",
            "min_level",
            "max_level",
            "max_players",
            "environment",
            "spawn_points",
            "npcs",
            "monsters",
            "resources",
            "is_pvp_enabled",
            "is_enabled",
            "created_at",
            "updated_at",
        ]
