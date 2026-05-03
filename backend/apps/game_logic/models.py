"""
Models para o app game_logic.

Este módulo define todos os modelos de instâncias dinâmicas do jogador —
dados que mudam durante o jogo e são sincronizados com o servidor Unity
de forma assíncrona via webhooks e WebSocket.

## Modelos Principais

### QuestTemplate
Template estático de uma missão (definição, objetivos, recompensas).
Criado pelo staff via Django Admin. Não muda durante o jogo.

### QuestProgress
Progresso de uma missão para um jogador específico. Referencia um
QuestTemplate e armazena contadores de objetivos concluídos.

### PlayerStats
Estatísticas de combate do personagem: level, XP, HP, MP, atributos
(strength, agility, intelligence, vitality) e pontos disponíveis.
- Criado automaticamente com `PlayerInstancesView.get()`.
- Atualizado pelo `GameLogicService` em operações de alocação, ganho de XP, etc.

### PlayerInventory
Inventário do jogador com ouro e lista de slots. Cada slot é um `PlayerItem`.
- `max_slots`: capacidade máxima de slots (expandível no futuro).
- `slots_used`: calculado como contagem de `PlayerItem` associados.

### PlayerItem
Um item específico no inventário, ligado a um `ItemTemplate` do app `game_data`.
- `equip_slot`: null = no inventário; "head"/"chest"/etc. = equipado.
- `slot_index`: posição na grade de inventário.

### PlayerSkill
Instância de uma habilidade aprendida pelo jogador. Referencia um `SkillTemplate`.
- `level`: nível atual da habilidade (começa em 1).
- `is_equipped`: se aparece na barra de habilidades ativa.

### Party / PartyMember
Grupo de até 5 jogadores (`MAX_SIZE = 5`). Um jogador é o líder (`leader`).
- `Party.dissolve()` — remove todos os membros e deleta o grupo.
- `Party.remove_member(user)` — remove um membro ou dissolve se for o líder.

## Sincronização com Unity
O servidor de jogo (Unity/GameServer) reporta eventos via:
- `POST /api/v1/game-logic/events/` — webhook autenticado por HMAC
- WebSocket (`ws://`) — estado em tempo real para eventos críticos

## Como Usar (exemplo)
```python
from apps.game_logic.services import GameLogicService

# Obter ou criar instâncias do jogador
instances = GameLogicService.get_or_create_player_instances(user)
stats = instances["stats"]
inventory = instances["inventory"]

# Alocar pontos
GameLogicService.allocate_points(user, strength=1, vitality=2)
```
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
    objectives = models.JSONField(
        default=list,
        help_text='[{"key": "kill_wolf", "description": "Kill wolves", "target_count": 5}]',
    )
    rewards = models.JSONField(
        default=dict,
        help_text='{"xp": 500, "gold": 100, "items": [{"item_template_id": "<uuid>", "quantity": 1}]}',
    )
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
        indexes = [
            models.Index(fields=["quest_type", "is_active"]),
            models.Index(fields=["level_required"]),
        ]

    def __str__(self):
        return f"[{self.get_quest_type_display()}] {self.name}"


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

    # When non-empty, marks the equipment slot this item occupies (weapon, helmet, etc.)
    equip_slot = models.CharField(max_length=20, blank=True, default="")

    class Meta:
        db_table = "player_items"
        verbose_name = "Player Item"
        verbose_name_plural = "Player Items"
        unique_together = ["inventory", "slot_index"]
        ordering = ["slot_index"]
        indexes = [
            models.Index(fields=["inventory", "slot_index"]),
            models.Index(fields=["inventory", "item_template"]),
            models.Index(fields=["inventory", "equip_slot"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["inventory", "equip_slot"],
                condition=models.Q(equip_slot__gt=""),
                name="unique_equipped_slot_per_inventory",
            ),
        ]

    def __str__(self):
        return f"{self.item_template.name} x{self.quantity} (slot {self.slot_index})"


class PlayerStats(UUIDModel):
    """Player stats instance."""

    FACTION_CHOICES = [
        ("", "None"),
        ("vanguarda", "Vanguarda da Alvorada"),
        ("legiao", "Legião do Eclipse"),
    ]
    CLASS_CHOICES = [
        ("", "None"),
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
        ("", "None"),
        ("humano", "Humano"),
        ("elfo", "Elfo"),
        ("draconato", "Draconato"),
        ("morto_vivo", "Morto-Vivo"),
    ]

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
    pvp_kills  = models.IntegerField(default=0)
    pvp_deaths = models.IntegerField(default=0)
    last_pos_x = models.IntegerField(default=0, help_text="Last known X position in centimeters")
    last_pos_y = models.IntegerField(default=0, help_text="Last known Y position in centimeters")
    # Identity — chosen at character creation, immutable after that
    faction = models.CharField(max_length=20, choices=FACTION_CHOICES, blank=True, default="")
    character_class = models.CharField(max_length=20, choices=CLASS_CHOICES, blank=True, default="")
    race = models.CharField(max_length=20, choices=RACE_CHOICES, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "player_stats"
        verbose_name = "Player Stats"
        verbose_name_plural = "Player Stats"
        indexes = [
            models.Index(fields=["faction"]),
            models.Index(fields=["character_class"]),
        ]

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


class Party(UUIDModel):
    """Active adventuring party — up to MAX_SIZE members sharing XP and protected from friendly fire."""

    MAX_SIZE = 5

    leader = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="led_parties",
    )
    members = models.ManyToManyField(
        "accounts.User",
        through="PartyMember",
        related_name="parties",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "parties"
        verbose_name = "Party"
        verbose_name_plural = "Parties"
        indexes = [
            models.Index(fields=["is_active"]),
            models.Index(fields=["leader"]),
        ]

    def __str__(self):
        return f"Party led by {self.leader.display_name}"


class PartyMember(UUIDModel):
    """Through-model for Party ↔ User membership."""

    party = models.ForeignKey(Party, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="party_memberships")
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "party_members"
        verbose_name = "Party Member"
        verbose_name_plural = "Party Members"
        unique_together = ["party", "user"]

    def __str__(self):
        return f"{self.user.display_name} in {self.party}"
