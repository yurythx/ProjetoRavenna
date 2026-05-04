"""
Models para o app game_logic.
"""
from django.db import models
from apps.common.models import UUIDModel

class QuestTemplate(UUIDModel):
    """Static definition of a quest — what objectives it has and what rewards it gives."""
    QUEST_TYPES = [
        ("main", "Main Story"),
        ("side", "Side Quest"),
        ("daily", "Daily"),
        ("repeatable", "Repeatable"),
    ]
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    quest_type = models.CharField(max_length=20, choices=QUEST_TYPES, default="side")
    objectives = models.JSONField(default=list)
    rewards = models.JSONField(default=dict)
    level_required = models.IntegerField(default=1)
    is_repeatable = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "quest_templates"
        verbose_name = "Quest Template"
        verbose_name_plural = "Quest Templates"
        ordering = ["level_required", "name"]

    def __str__(self):
        return f"[{self.get_quest_type_display()}] {self.name}"


class Character(UUIDModel):
    """The central character model representing a player hero."""
    FACTION_CHOICES = [
        ("vanguarda", "Vanguarda da Alvorada"),
        ("legiao", "Legião do Eclipse"),
    ]
    CLASS_CHOICES = [
        ("paladino", "Paladino"),
        ("mage", "Mage"),
        ("archer", "Archer"),
        ("eldari", "Eldari"),
        ("cavaleiro_dragao", "Cavaleiro Dragão"),
        ("ignis", "Ignis"),
        ("shadow", "Shadow"),
        ("necromante", "Necromante"),
    ]
    RACE_CHOICES = [
        ("humano", "Humano"),
        ("elfo", "Elfo"),
        ("draconato", "Draconato"),
        ("morto_vivo", "Morto-Vivo"),
    ]

    owner = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="characters"
    )
    name = models.CharField(max_length=32, unique=True)
    character_class = models.CharField(max_length=20, choices=CLASS_CHOICES)
    race = models.CharField(max_length=20, choices=RACE_CHOICES)
    faction = models.CharField(max_length=20, choices=FACTION_CHOICES)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "game_characters"
        verbose_name = "Character"
        verbose_name_plural = "Characters"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.get_character_class_display()})"


class PlayerInventory(UUIDModel):
    """Player inventory instance linked to a Character."""
    character = models.OneToOneField(
        Character,
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
    equip_slot = models.CharField(max_length=20, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "player_items"
        unique_together = ["inventory", "slot_index"]


class PlayerStats(UUIDModel):
    """Player stats instance linked to a Character."""
    character = models.OneToOneField(
        Character,
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
    pvp_kills  = models.IntegerField(default=0)
    pvp_deaths = models.IntegerField(default=0)
    last_pos_x = models.IntegerField(default=0)
    last_pos_y = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "player_stats"


class QuestProgress(UUIDModel):
    """Player quest progress linked to a Character."""
    character = models.ForeignKey(
        Character,
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
        unique_together = ["character", "quest_id"]


class PlayerSkill(UUIDModel):
    """Player learned skills linked to a Character."""
    character = models.ForeignKey(
        Character,
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
        unique_together = ["character", "skill_template"]


class GameSession(UUIDModel):
    character = models.ForeignKey(Character, on_delete=models.CASCADE, related_name='sessions')
    last_map_key = models.CharField(max_length=100, null=True, blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    last_heartbeat_at = models.DateTimeField(auto_now=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'game_sessions'


class Party(UUIDModel):
    leader = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="led_parties")
    members = models.ManyToManyField("accounts.User", through="PartyMember", related_name="parties")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "parties"


class PartyMember(UUIDModel):
    party = models.ForeignKey(Party, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="party_memberships")
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "party_members"
        unique_together = ["party", "user"]
