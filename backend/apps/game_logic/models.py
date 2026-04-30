"""
Models for game_logic app.
Dynamic player instances - synced asynchronously between Unity and DRF.
"""
from django.db import models

from apps.common.models import UUIDModel


class PlayerInventory(UUIDModel):
    """Player inventory instance."""

    owner = models.OneToOneField(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="inventory"
    )
    gold = models.IntegerField(default=0)
    slots_used = models.IntegerField(default=0)
    max_slots = models.IntegerField(default=100)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "player_inventories"
        verbose_name = "Player Inventory"
        verbose_name_plural = "Player Inventories"

    def __str__(self):
        return f"Inventory of {self.owner.display_name}"


class PlayerItem(UUIDModel):
    """Item instance inside a player inventory."""

    inventory = models.ForeignKey(
        PlayerInventory,
        on_delete=models.CASCADE,
        related_name="items_rel",
    )
    item_template = models.ForeignKey(
        "game_data.ItemTemplate",
        on_delete=models.CASCADE,
        related_name="player_items",
    )
    quantity = models.IntegerField(default=1)
    slot_index = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "player_items"
        verbose_name = "Player Item"
        verbose_name_plural = "Player Items"
        unique_together = ["inventory", "slot_index"]
        ordering = ["slot_index"]
        indexes = [
            models.Index(fields=["inventory", "slot_index"]),
            models.Index(fields=["inventory", "item_template"]),
        ]

    def __str__(self):
        return f"{self.item_template.name} x{self.quantity} (slot {self.slot_index})"


class PlayerStats(UUIDModel):
    """Player stats instance."""

    owner = models.OneToOneField(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="stats"
    )
    level = models.IntegerField(default=1)
    experience = models.IntegerField(default=0)
    health = models.IntegerField(default=100)
    max_health = models.IntegerField(default=100)
    mana = models.IntegerField(default=100)
    max_mana = models.IntegerField(default=100)
    strength = models.IntegerField(default=10)
    agility = models.IntegerField(default=10)
    intelligence = models.IntegerField(default=10)
    vitality = models.IntegerField(default=10)
    points_remaining = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "player_stats"
        verbose_name = "Player Stats"
        verbose_name_plural = "Player Stats"

    def __str__(self):
        return f"Stats of {self.owner.display_name} (Lv.{self.level})"


class QuestProgress(UUIDModel):
    """Player quest progress."""

    owner = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="quest_progress"
    )
    quest_id = models.CharField(max_length=100)
    status = models.CharField(
        max_length=20,
        choices=[
            ("not_started", "Not Started"),
            ("in_progress", "In Progress"),
            ("completed", "Completed"),
            ("failed", "Failed"),
        ],
        default="not_started"
    )
    current_objectives = models.JSONField(default=dict)
    completed_at = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "player_quest_progress"
        verbose_name = "Quest Progress"
        verbose_name_plural = "Quest Progress"
        unique_together = ["owner", "quest_id"]
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.quest_id} - {self.status}"


class PlayerSkill(UUIDModel):
    """Player learned skills."""

    owner = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="skills"
    )
    skill_template = models.ForeignKey(
        "game_data.SkillTemplate",
        on_delete=models.CASCADE,
        related_name="player_skills"
    )
    current_level = models.IntegerField(default=1)
    is_equipped = models.BooleanField(default=False)
    slot_index = models.IntegerField(null=True, blank=True)
    learned_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "player_skills"
        verbose_name = "Player Skill"
        verbose_name_plural = "Player Skills"
        unique_together = ["owner", "skill_template"]

    def __str__(self):
        return f"{self.skill_template.name} Lv.{self.current_level}"


class GameSession(UUIDModel):
    player = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='game_sessions')
    started_at = models.DateTimeField(auto_now_add=True)
    last_heartbeat_at = models.DateTimeField(auto_now=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    hwid = models.CharField(max_length=255, blank=True)
    last_map_key = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'game_sessions'
        verbose_name = 'Game Session'
        verbose_name_plural = 'Game Sessions'
        ordering = ['-started_at']

    def __str__(self):
        return f'Session of {self.player.username} ({self.started_at})'
