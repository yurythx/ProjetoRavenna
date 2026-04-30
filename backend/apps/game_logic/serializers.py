"""
Serializers for game_logic app.
"""
from rest_framework import serializers

from apps.game_logic.models import PlayerInventory, PlayerItem, PlayerSkill, PlayerStats, QuestProgress


class PlayerInventorySerializer(serializers.ModelSerializer):
    """Serializer for player inventory."""

    items = serializers.SerializerMethodField()
    slots_used = serializers.SerializerMethodField()

    class Meta:
        model = PlayerInventory
        fields = [
            "id",
            "gold",
            "slots_used",
            "max_slots",
            "items",
            "updated_at",
        ]

    def get_items(self, obj):
        items = PlayerItem.objects.filter(inventory=obj).select_related("item_template").order_by("slot_index")
        return [
            {
                "slot_index": item.slot_index,
                "template_id": str(item.item_template_id),
                "name": item.item_template.name,
                "quantity": item.quantity,
            }
            for item in items
        ]

    def get_slots_used(self, obj):
        return PlayerItem.objects.filter(inventory=obj).count()


class PlayerStatsSerializer(serializers.ModelSerializer):
    """Serializer for player stats."""

    class Meta:
        model = PlayerStats
        fields = [
            "id",
            "level",
            "experience",
            "health",
            "max_health",
            "mana",
            "max_mana",
            "strength",
            "agility",
            "intelligence",
            "vitality",
            "points_remaining",
            "updated_at",
        ]


class QuestProgressSerializer(serializers.ModelSerializer):
    """Serializer for quest progress."""

    class Meta:
        model = QuestProgress
        fields = [
            "id",
            "quest_id",
            "status",
            "current_objectives",
            "started_at",
            "completed_at",
        ]


class PlayerSkillSerializer(serializers.ModelSerializer):
    """Serializer for player skills."""

    skill_name = serializers.CharField(source="skill_template.name", read_only=True)

    class Meta:
        model = PlayerSkill
        fields = [
            "id",
            "skill_template",
            "skill_name",
            "current_level",
            "is_equipped",
            "slot_index",
            "learned_at",
        ]


class AddItemSerializer(serializers.Serializer):
    """Serializer for adding item to inventory."""

    item_template_id = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=1, default=1)


class UpdateStatsSerializer(serializers.Serializer):
    """Serializer for updating player stats."""

    health = serializers.IntegerField(required=False)
    mana = serializers.IntegerField(required=False)


class GainExperienceSerializer(serializers.Serializer):
    """Serializer for gaining experience."""

    amount = serializers.IntegerField(min_value=1)
    hwid = serializers.CharField(required=False, allow_blank=True)
    user_id = serializers.UUIDField(required=False)


class AllocatePointsSerializer(serializers.Serializer):
    """Serializer for allocating attribute points."""

    strength = serializers.IntegerField(min_value=0, required=False, default=0)
    agility = serializers.IntegerField(min_value=0, required=False, default=0)
    intelligence = serializers.IntegerField(min_value=0, required=False, default=0)
    vitality = serializers.IntegerField(min_value=0, required=False, default=0)


class LearnSkillSerializer(serializers.Serializer):
    """Serializer for learning a skill."""

    skill_template_id = serializers.UUIDField()
