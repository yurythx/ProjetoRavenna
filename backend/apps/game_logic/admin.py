"""
Admin configuration for game_logic app.
Updated for Multi-Character Architecture.
"""
from django.contrib import admin
from apps.game_logic.models import (
    Character, 
    PlayerInventory, 
    PlayerItem, 
    PlayerSkill, 
    PlayerStats, 
    QuestProgress, 
    QuestTemplate, 
    GameSession,
    Party,
    PartyMember
)

@admin.register(Character)
class CharacterAdmin(admin.ModelAdmin):
    list_display = ["name", "owner", "character_class", "race", "faction", "is_active", "created_at"]
    list_filter = ["character_class", "race", "faction", "is_active"]
    search_fields = ["name", "owner__username", "owner__email"]
    raw_id_fields = ["owner"]

@admin.register(PlayerInventory)
class PlayerInventoryAdmin(admin.ModelAdmin):
    list_display = ["character", "gold", "slots_used", "max_slots", "updated_at"]
    search_fields = ["character__name", "character__owner__username"]
    raw_id_fields = ["character"]

@admin.register(PlayerItem)
class PlayerItemAdmin(admin.ModelAdmin):
    list_display = ["inventory", "item_template", "quantity", "slot_index", "updated_at"]
    list_filter = ["item_template__item_type", "item_template__rarity"]
    search_fields = ["inventory__character__name", "item_template__name"]
    raw_id_fields = ["inventory", "item_template"]

@admin.register(PlayerStats)
class PlayerStatsAdmin(admin.ModelAdmin):
    list_display = [
        "character",
        "level",
        "experience",
        "health",
        "mana",
        "strength",
        "agility",
        "intelligence",
        "vitality",
    ]
    search_fields = ["character__name", "character__owner__username"]
    raw_id_fields = ["character"]

@admin.register(QuestProgress)
class QuestProgressAdmin(admin.ModelAdmin):
    list_display = ["character", "quest_id", "status", "started_at", "completed_at"]
    list_filter = ["status"]
    search_fields = ["character__name", "quest_id"]
    raw_id_fields = ["character"]

@admin.register(PlayerSkill)
class PlayerSkillAdmin(admin.ModelAdmin):
    list_display = ["character", "skill_template", "current_level", "is_equipped", "slot_index"]
    list_filter = ["is_equipped", "skill_template__skill_type"]
    search_fields = ["character__name", "skill_template__name"]
    raw_id_fields = ["character", "skill_template"]

@admin.register(QuestTemplate)
class QuestTemplateAdmin(admin.ModelAdmin):
    list_display = ["name", "quest_type", "level_required", "is_repeatable", "is_active", "updated_at"]
    list_filter = ["quest_type", "is_active", "is_repeatable"]
    search_fields = ["name", "description"]

@admin.register(GameSession)
class GameSessionAdmin(admin.ModelAdmin):
    list_display = ["character", "is_active", "started_at", "last_heartbeat_at", "ended_at", "ip_address"]
    list_filter = ["is_active"]
    search_fields = ["character__name", "character__owner__username", "ip_address"]
    raw_id_fields = ["character"]
    date_hierarchy = "started_at"

@admin.register(Party)
class PartyAdmin(admin.ModelAdmin):
    list_display = ["id", "leader", "is_active", "created_at"]
    raw_id_fields = ["leader"]

@admin.register(PartyMember)
class PartyMemberAdmin(admin.ModelAdmin):
    list_display = ["party", "user", "joined_at"]
    raw_id_fields = ["party", "user"]
