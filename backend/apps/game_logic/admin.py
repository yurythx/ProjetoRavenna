"""
Admin configuration for game_logic app.
"""
from django.contrib import admin

from apps.game_logic.models import PlayerInventory, PlayerItem, PlayerSkill, PlayerStats, QuestProgress, QuestTemplate, GameSession


@admin.register(PlayerInventory)
class PlayerInventoryAdmin(admin.ModelAdmin):
    list_display = ["owner", "gold", "slots_used", "max_slots", "updated_at"]
    search_fields = ["owner__username", "owner__email"]
    raw_id_fields = ["owner"]


@admin.register(PlayerItem)
class PlayerItemAdmin(admin.ModelAdmin):
    list_display = ["inventory", "item_template", "quantity", "slot_index", "updated_at"]
    list_filter = ["item_template__item_type", "item_template__rarity"]
    search_fields = ["inventory__owner__username", "inventory__owner__email", "item_template__name"]
    raw_id_fields = ["inventory", "item_template"]


@admin.register(PlayerStats)
class PlayerStatsAdmin(admin.ModelAdmin):
    list_display = [
        "owner",
        "level",
        "experience",
        "health",
        "mana",
        "strength",
        "agility",
        "intelligence",
        "vitality",
    ]
    search_fields = ["owner__username", "owner__email"]
    raw_id_fields = ["owner"]


@admin.register(QuestProgress)
class QuestProgressAdmin(admin.ModelAdmin):
    list_display = ["owner", "quest_id", "status", "started_at", "completed_at"]
    list_filter = ["status"]
    search_fields = ["owner__username", "quest_id"]
    raw_id_fields = ["owner"]


@admin.register(PlayerSkill)
class PlayerSkillAdmin(admin.ModelAdmin):
    list_display = ["owner", "skill_template", "current_level", "is_equipped", "slot_index"]
    list_filter = ["is_equipped", "skill_template__skill_type"]
    search_fields = ["owner__username", "skill_template__name"]
    raw_id_fields = ["owner", "skill_template"]


@admin.register(QuestTemplate)
class QuestTemplateAdmin(admin.ModelAdmin):
    list_display = ["name", "quest_type", "level_required", "is_repeatable", "is_active", "updated_at"]
    list_filter = ["quest_type", "is_active", "is_repeatable"]
    search_fields = ["name", "description"]


@admin.register(GameSession)
class GameSessionAdmin(admin.ModelAdmin):
    list_display = ["player", "last_map_key", "is_active", "started_at", "last_heartbeat_at", "ended_at"]
    list_filter = ["is_active", "last_map_key"]
    search_fields = ["player__username", "player__email", "hwid"]
    raw_id_fields = ["player"]
    date_hierarchy = "started_at"
