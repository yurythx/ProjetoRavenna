"""
Serializers para o app game_logic.

Este módulo contém todos os serializers DRF usados nas views de game_logic.
Cada serializer valida entrada ou formata saída de um modelo ou operação específica.

## Serializers de Saída (leitura)

### PlayerStatsSerializer
Serializa `PlayerStats` completo: level, XP, HP/MP (atual e máximo), atributos,
pontos disponíveis, classe, raça e facção. Usado em `GET /api/v1/game-logic/`.

### PlayerInventorySerializer
Serializa `PlayerInventory` com lista de itens via `SerializerMethodField`.
Cada item inclui: id, slot_index, template_id, name, quantity, equip_slot,
rarity, item_type. Usado em `GET /api/v1/game-logic/inventory/`.

### PlayerSkillSerializer
Serializa `PlayerSkill` com dados do template (nome, descrição, tipo).
Usado em `GET /api/v1/game-logic/skills/`.

### QuestProgressSerializer
Serializa o progresso de missão com os objetivos atuais (dict de contadores).
Usado em `GET /api/v1/game-logic/quests/`.

### QuestTemplateSerializer
Serializa templates de missão (estático): nome, tipo, objetivos, recompensas.
Usado em `GET /api/v1/game-logic/quest-templates/`.

## Serializers de Entrada (validação)

### AllocatePointsSerializer
Valida `{ strength?, agility?, intelligence?, vitality? }`. Todos opcionais,
inteiros ≥ 0. Soma total deve ser ≤ `points_remaining` (validado no service).

### CreateCharacterSerializer
Valida criação inicial: `{ name, class_type, race, faction }`.
Verifica unicidade de nome e opções válidas de classe/raça/facção.

### EquipItemSerializer / AddItemSerializer / GainExperienceSerializer
Validam operações específicas de inventário e XP.

## Convenção
- Serializers de leitura têm sufixo `Serializer`.
- Campos de entrada inválidos retornam 400 com detalhes no corpo.
- Campos monetários (gold) e de quantidade são inteiros não-negativos.
"""
from rest_framework import serializers

from apps.game_logic.models import PlayerInventory, PlayerItem, PlayerSkill, PlayerStats, QuestProgress, QuestTemplate


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
                "id": str(item.id),
                "slot_index": item.slot_index,
                "template_id": str(item.item_template_id),
                "name": item.item_template.name,
                "quantity": item.quantity,
                "equip_slot": item.equip_slot,
                "rarity": item.item_template.rarity,
                "item_type": item.item_template.item_type,
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
            "faction",
            "character_class",
            "race",
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

    amount = serializers.IntegerField(min_value=1, max_value=10_000)
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


class EquipItemSerializer(serializers.Serializer):
    """Serializer for equipping an item."""

    player_item_id = serializers.UUIDField()
    equip_slot = serializers.ChoiceField(choices=[
        "weapon", "offhand", "helmet", "chest", "gloves", "boots", "ring_1", "ring_2", "amulet",
    ])


class CreateCharacterSerializer(serializers.Serializer):
    """Serializer for one-time character creation (class, race, faction)."""

    character_class = serializers.ChoiceField(choices=[
        "paladino", "mage", "archer", "eldari",
        "cavaleiro_dragao", "ignis", "shadow", "necromante",
    ])
    race = serializers.ChoiceField(choices=[
        "humano", "elfo", "draconato", "morto_vivo",
    ])
    faction = serializers.ChoiceField(choices=[
        "vanguarda", "legiao",
    ])


class QuestTemplateSerializer(serializers.ModelSerializer):
    """Public serializer for quest templates."""

    quest_type_display = serializers.CharField(source="get_quest_type_display", read_only=True)

    class Meta:
        model = QuestTemplate
        fields = [
            "id",
            "name",
            "description",
            "quest_type",
            "quest_type_display",
            "objectives",
            "rewards",
            "level_required",
            "is_repeatable",
        ]
