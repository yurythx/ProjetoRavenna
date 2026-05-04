"""
Views do app game_logic — endpoints REST para o frontend e o servidor Unity.
"""
import hashlib
import hmac
import logging
import os

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)

from apps.game_logic.models import Character, Party, PartyMember, PlayerInventory, PlayerSkill, PlayerStats, QuestProgress, QuestTemplate
from apps.game_logic.serializers import (
    AddItemSerializer,
    AllocatePointsSerializer,
    CreateCharacterSerializer,
    EquipItemSerializer,
    GainExperienceSerializer,
    LearnSkillSerializer,
    CharacterSerializer,
    PlayerInventorySerializer,
    PlayerSkillSerializer,
    PlayerStatsSerializer,
    QuestProgressSerializer,
    QuestTemplateSerializer,
    UpdateStatsSerializer,
)
from apps.game_logic.permissions import GameServerIPPermission
from apps.game_logic.services import GameLogicService
from apps.game_logic.throttles import GameServerThrottle

User = get_user_model()


def _get_character(request, char_id=None) -> Character | None:
    """Helper: busca o Character pelo ID garantindo que pertence ao usuário logado."""
    cid = char_id or request.query_params.get("character_id") or request.data.get("character_id")
    if not cid:
        return None
    return Character.objects.filter(id=cid, owner=request.user, is_active=True).first()


# ── Personagens ───────────────────────────────────────────────────────────────

class CharacterViewSet(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        chars = Character.objects.filter(owner=request.user, is_active=True)
        return Response(CharacterSerializer(chars, many=True).data)

    def post(self, request):
        serializer = CreateCharacterSerializer(data=request.data)
        if serializer.is_valid():
            try:
                char = GameLogicService.create_character(
                    request.user,
                    serializer.validated_data["name"],
                    serializer.validated_data["character_class"],
                    serializer.validated_data["race"],
                    serializer.validated_data["faction"],
                )
                return Response(CharacterSerializer(char).data, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        try:
            char = Character.objects.get(pk=pk, owner=request.user)
            char.is_active = False
            char.save()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Character.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)


# ── Instâncias do Jogador ─────────────────────────────────────────────────────

class PlayerInstancesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        char = _get_character(request)
        if not char:
            return Response({"error": "character_id required or not found"}, status=400)
        instances = GameLogicService.get_or_create_player_instances(char)
        return Response({
            "inventory": PlayerInventorySerializer(instances["inventory"]).data,
            "stats": PlayerStatsSerializer(instances["stats"]).data,
        })


class StatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        char = _get_character(request)
        if not char:
            return Response({"error": "character_id required or not found"}, status=400)
        stats, _ = PlayerStats.objects.get_or_create(character=char)
        return Response(PlayerStatsSerializer(stats).data)


# ── Inventário ────────────────────────────────────────────────────────────────

class InventoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        char = _get_character(request)
        if not char:
            return Response({"error": "character_id required or not found"}, status=400)
        inventory, _ = PlayerInventory.objects.get_or_create(character=char)
        return Response(PlayerInventorySerializer(inventory).data)

    def post(self, request):
        if not request.user.is_staff:
            return Response({"error": "Admin only"}, status=status.HTTP_403_FORBIDDEN)
        serializer = AddItemSerializer(data=request.data)
        if serializer.is_valid():
            try:
                char = _get_character(request)
                if not char:
                    return Response({"error": "character_id required"}, status=400)
                inventory = GameLogicService.add_item_to_inventory(
                    char,
                    serializer.validated_data["item_template_id"],
                    serializer.validated_data["quantity"],
                )
                return Response(PlayerInventorySerializer(inventory).data, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class InventoryItemView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, item_index):
        char = _get_character(request)
        if not char:
            return Response({"error": "character_id required or not found"}, status=400)
        try:
            inventory = GameLogicService.remove_item_from_inventory(char, int(item_index))
            return Response(PlayerInventorySerializer(inventory).data)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class EquipItemView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = EquipItemSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        char = _get_character(request)
        if not char:
            return Response({"error": "character_id required or not found"}, status=400)
        try:
            item = GameLogicService.equip_item(
                char,
                str(serializer.validated_data["player_item_id"]),
                serializer.validated_data["equip_slot"],
            )
            return Response({"ok": True, "equip_slot": item.equip_slot})
        except Exception as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class UnequipItemView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        equip_slot = request.data.get("equip_slot", "")
        if not equip_slot:
            return Response({"error": "equip_slot required"}, status=status.HTTP_400_BAD_REQUEST)
        char = _get_character(request)
        if not char:
            return Response({"error": "character_id required or not found"}, status=400)
        try:
            GameLogicService.unequip_item(char, equip_slot)
            return Response({"ok": True})
        except Exception as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


# ── Stats e Progressão ────────────────────────────────────────────────────────

class GainExperienceView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request):
        serializer = GainExperienceSerializer(data=request.data)
        if serializer.is_valid():
            char = _get_character(request)
            if not char:
                return Response({"error": "character_id required or not found"}, status=400)
            try:
                stats = GameLogicService.gain_experience(
                    char,
                    serializer.validated_data["amount"],
                    hwid=request.data.get("hwid", ""),
                )
                return Response(PlayerStatsSerializer(stats).data)
            except Exception as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AllocatePointsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = AllocatePointsSerializer(data=request.data)
        if serializer.is_valid():
            char = _get_character(request)
            if not char:
                return Response({"error": "character_id required or not found"}, status=400)
            try:
                stats = GameLogicService.allocate_points(char, serializer.validated_data)
                return Response(PlayerStatsSerializer(stats).data)
            except ValueError as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ── Missões ───────────────────────────────────────────────────────────────────

class QuestProgressView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        char = _get_character(request)
        if not char:
            return Response({"error": "character_id required or not found"}, status=400)
        quests = QuestProgress.objects.filter(character=char)
        return Response(QuestProgressSerializer(quests, many=True).data)

    def post(self, request):
        char = _get_character(request)
        quest_id = request.data.get("quest_id")
        if not char or not quest_id:
            return Response({"error": "character_id and quest_id required"}, status=400)
        try:
            progress = GameLogicService.start_quest(char, quest_id)
            return Response(QuestProgressSerializer(progress).data, status=201)
        except Exception as e:
            return Response({"error": str(e)}, status=400)


class QuestCompleteView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request):
        quest_id = request.data.get("quest_id")
        if not quest_id:
            return Response({"error": "quest_id required"}, status=400)
        char = _get_character(request)
        if not char:
            return Response({"error": "character_id required or not found"}, status=400)
        try:
            progress = GameLogicService.complete_quest(char, quest_id)
            return Response(QuestProgressSerializer(progress).data)
        except Exception as e:
            return Response({"error": str(e)}, status=404)


class QuestTemplatesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        level = request.query_params.get("level")
        quest_type = request.query_params.get("quest_type")
        qs = QuestTemplate.objects.filter(is_active=True)
        if level and level.isdigit():
            qs = qs.filter(level_required__lte=int(level))
        if quest_type:
            qs = qs.filter(quest_type=quest_type)
        return Response(QuestTemplateSerializer(qs, many=True).data)


# ── Habilidades ───────────────────────────────────────────────────────────────

class PlayerSkillsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        char = _get_character(request)
        if not char:
            return Response({"error": "character_id required or not found"}, status=400)
        skills = PlayerSkill.objects.filter(character=char)
        return Response(PlayerSkillSerializer(skills, many=True).data)

    def post(self, request):
        if not request.user.is_staff:
            return Response(status=403)
        serializer = LearnSkillSerializer(data=request.data)
        if serializer.is_valid():
            char = _get_character(request)
            if not char:
                return Response({"error": "character_id required or not found"}, status=400)
            try:
                skill = GameLogicService.learn_skill(char, serializer.validated_data["skill_template_id"])
                return Response(PlayerSkillSerializer(skill).data, status=201)
            except Exception as e:
                return Response({"error": str(e)}, status=400)
        return Response(serializer.errors, status=400)


class UpgradeSkillView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, skill_id):
        char = _get_character(request)
        if not char:
            return Response({"error": "character_id required or not found"}, status=400)
        try:
            skill = GameLogicService.upgrade_skill(char, str(skill_id))
            return Response(PlayerSkillSerializer(skill).data)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


# ── Ranking ───────────────────────────────────────────────────────────────────

class LeaderboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        limit = int(request.query_params.get("limit", 10))
        lb = GameLogicService.get_leaderboard(limit=limit)
        return Response({"results": lb})


# ── Sessão de Jogo ────────────────────────────────────────────────────────────

class GameSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        char = _get_character(request)
        if not char:
            return Response({"error": "character_id required or not found"}, status=400)
        ip = request.META.get("REMOTE_ADDR")
        map_key = request.data.get("map_key", "")
        GameLogicService.start_game_session(char, ip=ip, map_key=map_key)
        return Response({"status": "session_started"}, status=201)

    def delete(self, request):
        char = _get_character(request)
        if not char:
            return Response({"error": "character_id required or not found"}, status=400)
        GameLogicService.end_game_session(char)
        return Response({"status": "session_ended"})


# ── Integração Unity ──────────────────────────────────────────────────────────

class GameEventWebhookView(APIView):
    permission_classes = [GameServerIPPermission]
    authentication_classes = []
    throttle_classes = [GameServerThrottle]

    _SECRET = os.environ.get("DJANGO_WEBHOOK_SECRET", "changeme")

    def post(self, request):
        signature = request.headers.get("X-Webhook-Secret", "")
        body = request.body
        expected = hmac.new(self._SECRET.encode(), body, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected):
            return Response({"error": "forbidden"}, status=status.HTTP_403_FORBIDDEN)

        event_type = request.data.get("event_type")
        player_id  = request.data.get("player_id")
        char_id    = request.data.get("character_id")
        data       = request.data.get("data", {})

        if not event_type or not player_id:
            return Response({"error": "event_type and player_id required"}, status=400)

        try:
            target_user = User.objects.get(id=player_id)
        except User.DoesNotExist:
            return Response({"error": "player not found"}, status=404)

        # Busca o personagem ativo — usa char_id se enviado, senão pega o mais recente
        char = None
        if char_id:
            char = Character.objects.filter(id=char_id, owner=target_user, is_active=True).first()
        if not char:
            char = Character.objects.filter(owner=target_user, is_active=True).order_by("-created_at").first()

        if event_type == "xp_gained":
            if char:
                amount = min(int(data.get("amount", 0)), 10_000)
                if amount > 0:
                    GameLogicService.gain_experience(char, amount, bypass_anticheat=True)

        elif event_type == "item_collected":
            if char:
                item_id  = data.get("item_template_id")
                quantity = int(data.get("quantity", 1))
                if item_id:
                    GameLogicService.add_item_to_inventory(char, item_id, quantity)

        elif event_type == "player_connected":
            if char:
                GameLogicService.start_game_session(
                    char,
                    ip=data.get("ip_address", ""),
                    map_key=data.get("map_key", "world_main"),
                )

        elif event_type == "player_action":
            if char:
                XP_PER_ACTION = {1: 5, 2: 5, 3: 10, 4: 2}
                xp = XP_PER_ACTION.get(int(data.get("action_id", 0)), 0)
                if xp:
                    GameLogicService.gain_experience(char, xp, bypass_anticheat=True)

        elif event_type == "player_disconnected":
            if char:
                pos_x = int(data.get("pos_x", 0))
                pos_y = int(data.get("pos_y", 0))
                hp    = int(data.get("hp", 0))
                GameLogicService.end_game_session(char)
                if hp > 0:
                    GameLogicService.save_player_position(char, pos_x, pos_y, hp)

        elif event_type == "player_killed":
            if char:
                victim_char_id = data.get("victim_character_id")
                if victim_char_id:
                    victim_char = Character.objects.filter(id=victim_char_id, is_active=True).first()
                    if victim_char:
                        GameLogicService.record_pvp_kill(killer=char, victim=victim_char)

        elif event_type == "player_died":
            if char:
                try:
                    GameLogicService.apply_death_penalty(char)
                except Exception as exc:
                    logger.warning("apply_death_penalty failed for char %s: %s", char_id, exc)

        elif event_type == "npc_killed":
            if char:
                npc_type = data.get("npc_type", "")
                if npc_type:
                    GameLogicService.update_kill_progress(char, npc_type)

        elif event_type == "quest_complete":
            if char:
                quest_id = data.get("quest_id")
                if quest_id:
                    try:
                        GameLogicService.complete_quest(char, quest_id)
                    except Exception:
                        pass

        logger.info("Webhook event '%s' processed for player %s / char %s", event_type, player_id, char_id)
        return Response({"ok": True})


class GameStateView(APIView):
    """Retorna estado completo do personagem para o servidor Unity."""
    permission_classes = [GameServerIPPermission]
    authentication_classes = []
    throttle_classes = [GameServerThrottle]

    _SECRET = os.environ.get("DJANGO_WEBHOOK_SECRET", "changeme")

    def get(self, request, user_id: str):
        expected = hmac.new(self._SECRET.encode(), user_id.encode(), hashlib.sha256).hexdigest()
        signature = request.headers.get("X-Webhook-Secret", "")
        if not hmac.compare_digest(signature, expected):
            return Response({"error": "forbidden"}, status=status.HTTP_403_FORBIDDEN)

        char_id = request.query_params.get("character_id")
        char = None
        if char_id:
            char = Character.objects.filter(id=char_id, owner__id=user_id, is_active=True).select_related("owner").first()
        if not char:
            char = Character.objects.filter(owner__id=user_id, is_active=True).order_by("-created_at").select_related("owner").first()

        if not char:
            return Response({"error": "No active character found"}, status=404)

        stats = PlayerStats.objects.filter(character=char).first()
        if not stats:
            return Response({"error": "Stats not found"}, status=404)

        bonuses = GameLogicService.get_equipment_bonuses(char)
        skill_qs = PlayerSkill.objects.filter(character=char, is_equipped=True).select_related("skill_template")
        skills = [
            {"server_id": s.skill_template.server_id, "current_level": s.current_level, "slot_index": s.slot_index}
            for s in skill_qs if s.skill_template.server_id is not None
        ]
        passive_bonuses = GameLogicService.compute_passive_bonuses(char)
        active_party = GameLogicService.get_active_party(char.owner)

        return Response({
            "character_id":   str(char.id),
            "name":           char.name,
            "hp":             stats.health,
            "max_hp":         stats.max_health,
            "mana":           stats.mana,
            "max_mana":       stats.max_mana,
            "pos_x":          stats.last_pos_x,
            "pos_y":          stats.last_pos_y,
            "level":          stats.level,
            "strength":       stats.strength,
            "agility":        stats.agility,
            "intelligence":   stats.intelligence,
            "vitality":       stats.vitality,
            "faction":        char.faction,
            "character_class": char.character_class,
            "race":           char.race,
            "equipment_bonuses": bonuses,
            "passive_bonuses":   passive_bonuses,
            "skills":         skills,
            "party_id":       str(active_party.id) if active_party else None,
        })


# ── Grupo (Party) ─────────────────────────────────────────────────────────────

class PartyView(APIView):
    permission_classes = [IsAuthenticated]

    def _serialize_party(self, party: Party) -> dict:
        return {
            "id": str(party.id),
            "leader_id": str(party.leader_id),
            "members": [
                {"user_id": str(m.user_id), "display_name": m.user.display_name or m.user.username}
                for m in party.memberships.select_related("user").all()
            ],
        }

    def get(self, request):
        party = GameLogicService.get_active_party(request.user)
        if party is None:
            return Response({"error": "not in a party"}, status=status.HTTP_404_NOT_FOUND)
        return Response(self._serialize_party(party))

    def post(self, request):
        party = GameLogicService.create_party(request.user)
        return Response(self._serialize_party(party), status=status.HTTP_201_CREATED)

    def delete(self, request):
        GameLogicService.leave_party(request.user)
        return Response({"ok": True})


class PartyInviteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user_id = request.data.get("user_id")
        if not user_id:
            return Response({"error": "user_id required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            party = GameLogicService.invite_to_party(request.user, str(user_id))
            return Response({"id": str(party.id), "member_count": party.memberships.count()})
        except Party.DoesNotExist:
            return Response({"error": "No active party found."}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


# ── Criação de Personagem (legacy — mantido para compatibilidade) ──────────────

class CreateCharacterView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CreateCharacterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            char = GameLogicService.create_character(
                request.user,
                serializer.validated_data.get("name", "Herói"),
                serializer.validated_data["character_class"],
                serializer.validated_data["race"],
                serializer.validated_data["faction"],
            )
            skills = PlayerSkill.objects.filter(character=char)
            return Response(
                {**CharacterSerializer(char).data, "skills_granted": PlayerSkillSerializer(skills, many=True).data},
                status=status.HTTP_201_CREATED,
            )
        except ValueError as exc:
            already_created = "already created" in str(exc)
            return Response(
                {"error": str(exc)},
                status=status.HTTP_409_CONFLICT if already_created else status.HTTP_400_BAD_REQUEST,
            )
