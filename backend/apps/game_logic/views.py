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

from apps.game_logic.models import Party, PartyMember, PlayerInventory, PlayerSkill, PlayerStats, QuestProgress, QuestTemplate
from apps.game_logic.serializers import (
    AddItemSerializer,
    AllocatePointsSerializer,
    CreateCharacterSerializer,
    EquipItemSerializer,
    GainExperienceSerializer,
    LearnSkillSerializer,
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

class PlayerInstancesView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        instances = GameLogicService.get_or_create_player_instances(request.user)
        return Response({
            "inventory": PlayerInventorySerializer(instances["inventory"]).data,
            "stats": PlayerStatsSerializer(instances["stats"]).data,
        })

class InventoryView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        inventory, _ = PlayerInventory.objects.get_or_create(owner=request.user)
        return Response(PlayerInventorySerializer(inventory).data)

    def post(self, request):
        if not request.user.is_staff:
            return Response({"error": "Admin only"}, status=status.HTTP_403_FORBIDDEN)
        serializer = AddItemSerializer(data=request.data)
        if serializer.is_valid():
            try:
                from apps.game_data.models import ItemTemplate as _ItemTemplate
                target_user = request.user
                user_id = request.data.get("user_id")
                if user_id and request.user.is_staff:
                    target_user = User.objects.get(id=user_id)

                inventory = GameLogicService.add_item_to_inventory(
                    target_user,
                    serializer.validated_data["item_template_id"],
                    serializer.validated_data["quantity"]
                )
                return Response(PlayerInventorySerializer(inventory).data, status=status.HTTP_201_CREATED)
            except _ItemTemplate.DoesNotExist:
                return Response({"error": "Item template not found"}, status=status.HTTP_404_NOT_FOUND)
            except Exception as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class InventoryItemView(APIView):
    permission_classes = [IsAuthenticated]
    def delete(self, request, item_index):
        try:
            inventory = GameLogicService.remove_item_from_inventory(request.user, int(item_index))
            return Response(PlayerInventorySerializer(inventory).data)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class StatsView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        stats, _ = PlayerStats.objects.get_or_create(owner=request.user)
        return Response(PlayerStatsSerializer(stats).data)

class GainExperienceView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]
    def post(self, request):
        serializer = GainExperienceSerializer(data=request.data)
        if serializer.is_valid():
            try:
                user_id = request.data.get("user_id")
                target_user = User.objects.get(id=user_id) if user_id else request.user
                hwid = request.data.get("hwid", "")
                stats = GameLogicService.gain_experience(target_user, serializer.validated_data["amount"], hwid=hwid)
                return Response(PlayerStatsSerializer(stats).data)
            except Exception as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class AllocatePointsView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        serializer = AllocatePointsSerializer(data=request.data)
        if serializer.is_valid():
            try:
                stats = GameLogicService.allocate_points(request.user, serializer.validated_data)
                return Response(PlayerStatsSerializer(stats).data)
            except ValueError as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class QuestProgressView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        quests = QuestProgress.objects.filter(owner=request.user)
        return Response(QuestProgressSerializer(quests, many=True).data)
    def post(self, request):
        quest_id = request.data.get("quest_id")
        if not quest_id: return Response({"error": "quest_id required"}, status=400)
        progress = GameLogicService.start_quest(request.user, quest_id)
        return Response(QuestProgressSerializer(progress).data, status=201)

class QuestCompleteView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]
    def post(self, request):
        quest_id = request.data.get("quest_id")
        user_id = request.data.get("user_id")
        if not quest_id: return Response({"error": "quest_id required"}, status=400)
        try:
            target_user = User.objects.get(id=user_id) if user_id else request.user
            progress = GameLogicService.complete_quest(target_user, quest_id)
            return Response(QuestProgressSerializer(progress).data)
        except Exception as e:
            return Response({"error": str(e)}, status=404)

class LeaderboardView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        limit = int(request.query_params.get("limit", 10))
        lb = GameLogicService.get_leaderboard(limit=limit)
        return Response({"results": lb})

class GameSessionView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        hwid = request.data.get("hwid", "")
        map_key = request.data.get("map_key", "")
        ip = request.META.get("REMOTE_ADDR")
        GameLogicService.start_game_session(request.user, hwid=hwid, ip=ip, map_key=map_key)
        return Response({"status": "session_started"}, status=201)
    def delete(self, request):
        GameLogicService.end_game_session(request.user)
        return Response({"status": "session_ended"})

class PlayerSkillsView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        skills = PlayerSkill.objects.filter(owner=request.user)
        return Response(PlayerSkillSerializer(skills, many=True).data)
    def post(self, request):
        if not request.user.is_staff: return Response(status=403)
        serializer = LearnSkillSerializer(data=request.data)
        if serializer.is_valid():
            try:
                from apps.game_data.models import SkillTemplate as _SkillTemplate
                skill = GameLogicService.learn_skill(request.user, serializer.validated_data["skill_template_id"])
                return Response(PlayerSkillSerializer(skill).data, status=201)
            except _SkillTemplate.DoesNotExist:
                return Response({"error": "Skill template not found"}, status=status.HTTP_404_NOT_FOUND)
            except Exception as e:
                return Response({"error": str(e)}, status=400)
        return Response(serializer.errors, status=400)


class UpgradeSkillView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, skill_id):
        try:
            skill = GameLogicService.upgrade_skill(request.user, str(skill_id))
            return Response(PlayerSkillSerializer(skill).data)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class QuestTemplatesView(APIView):
    """Active quest templates — requires authentication to prevent reward enumeration."""
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


class GameEventWebhookView(APIView):
    """
    Receives signed game events from the C# headless server.
    Authentication: HMAC-SHA256 signature in X-Webhook-Secret header.
    No JWT session required — this is a server-to-server call.
    """
    permission_classes = [GameServerIPPermission]
    authentication_classes = []
    throttle_classes = [GameServerThrottle]

    _SECRET = os.environ.get("DJANGO_WEBHOOK_SECRET", "changeme")

    def post(self, request):
        signature = request.headers.get("X-Webhook-Secret", "")
        body = request.body
        expected = hmac.new(
            self._SECRET.encode(),
            body,
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(signature, expected):
            logger.warning("Webhook signature mismatch from %s", request.META.get("REMOTE_ADDR"))
            return Response({"error": "forbidden"}, status=status.HTTP_403_FORBIDDEN)

        event_type = request.data.get("event_type")
        player_id  = request.data.get("player_id")
        data       = request.data.get("data", {})

        if not event_type or not player_id:
            return Response({"error": "event_type and player_id required"}, status=400)

        try:
            target = User.objects.get(id=player_id)
        except User.DoesNotExist:
            return Response({"error": "player not found"}, status=404)

        if event_type == "xp_gained":
            amount = min(int(data.get("amount", 0)), 10_000)
            if amount > 0:
                GameLogicService.gain_experience(target, amount)

        elif event_type == "item_collected":
            item_id  = data.get("item_template_id")
            quantity = int(data.get("quantity", 1))
            if item_id:
                GameLogicService.add_item_to_inventory(target, item_id, quantity)

        elif event_type == "player_connected":
            GameLogicService.start_game_session(
                user=target,
                hwid=data.get("hwid", ""),
                ip=data.get("ip_address", ""),
                map_key=data.get("map_key", "world_main")
            )

        elif event_type == "player_action":
            action_id = int(data.get("action_id", 0))
            # Action IDs: 1=melee, 2=ranged, 3=use_skill, 4=pickup
            XP_PER_ACTION = {1: 5, 2: 5, 3: 10, 4: 2}
            xp = XP_PER_ACTION.get(action_id, 0)
            if xp:
                GameLogicService.gain_experience(target, xp)

        elif event_type == "player_disconnected":
            pos_x = int(data.get("pos_x", 0))
            pos_y = int(data.get("pos_y", 0))
            hp    = int(data.get("hp",    0))
            GameLogicService.end_game_session(target)
            if hp > 0:
                GameLogicService.save_player_position(target, pos_x, pos_y, hp)

        elif event_type == "player_killed":
            victim_user_id = data.get("victim_user_id")
            if victim_user_id:
                try:
                    victim = User.objects.get(id=victim_user_id)
                    GameLogicService.record_pvp_kill(killer=target, victim=victim)
                except User.DoesNotExist:
                    pass

        elif event_type == "player_died":
            # Apply XP and gold penalty regardless of cause (pvp / npc)
            try:
                GameLogicService.apply_death_penalty(target)
            except Exception as exc:
                logger.warning("apply_death_penalty failed for %s: %s", player_id, exc)

        elif event_type == "npc_killed":
            npc_type = data.get("npc_type", "")
            if npc_type:
                GameLogicService.update_kill_progress(target, npc_type)

        elif event_type == "quest_complete":
            quest_id = data.get("quest_id")
            if quest_id:
                try:
                    GameLogicService.complete_quest(target, quest_id)
                except Exception:
                    pass

        logger.info("Webhook event '%s' processed for player %s", event_type, player_id)
        return Response({"ok": True})


class GameStateView(APIView):
    """
    Server-to-server endpoint: returns full player state for handshake.
    Authentication: HMAC-SHA256(secret, user_id) in X-Webhook-Secret header.
    """
    permission_classes = [GameServerIPPermission]
    authentication_classes = []
    throttle_classes = [GameServerThrottle]

    _SECRET = os.environ.get("DJANGO_WEBHOOK_SECRET", "changeme")

    def get(self, request, user_id: str):
        expected = hmac.new(
            self._SECRET.encode(),
            user_id.encode(),
            hashlib.sha256,
        ).hexdigest()
        signature = request.headers.get("X-Webhook-Secret", "")
        if not hmac.compare_digest(signature, expected):
            logger.warning("GameStateView signature mismatch from %s", request.META.get("REMOTE_ADDR"))
            return Response({"error": "forbidden"}, status=status.HTTP_403_FORBIDDEN)

        from apps.game_logic.models import PlayerStats as _PlayerStats
        from apps.game_logic.models import PlayerSkill as _PlayerSkill
        try:
            stats = _PlayerStats.objects.get(owner__id=user_id)
        except _PlayerStats.DoesNotExist:
            return Response({"error": "not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            target = User.objects.get(id=user_id)
            bonuses = GameLogicService.get_equipment_bonuses(target)
        except User.DoesNotExist:
            bonuses = {
                "phys_damage": 0, "mag_damage": 0,
                "phys_defense": 0, "mag_defense": 0,
                "health": 0, "mana": 0, "attack_speed": 0.0, "speed": 0,
            }

        skill_qs = _PlayerSkill.objects.filter(
            owner__id=user_id, is_equipped=True
        ).select_related("skill_template")
        skills = [
            {
                "server_id": s.skill_template.server_id,
                "current_level": s.current_level,
                "slot_index": s.slot_index,
            }
            for s in skill_qs
            if s.skill_template.server_id is not None
        ]

        passive_bonuses = GameLogicService.compute_passive_bonuses(target)
        active_party = GameLogicService.get_active_party(target)

        return Response({
            "hp":              stats.health,
            "max_hp":          stats.max_health,
            "mana":            stats.mana,
            "max_mana":        stats.max_mana,
            "pos_x":           stats.last_pos_x,
            "pos_y":           stats.last_pos_y,
            "level":           stats.level,
            "strength":        stats.strength,
            "agility":         stats.agility,
            "intelligence":    stats.intelligence,
            "vitality":        stats.vitality,
            "faction":         stats.faction,
            "character_class": stats.character_class,
            "race":            stats.race,
            "equipment_bonuses": bonuses,
            "passive_bonuses":   passive_bonuses,
            "skills":          skills,
            "party_id":        str(active_party.id) if active_party else None,
        })


class EquipItemView(APIView):
    """Equip an inventory item into a given slot."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = EquipItemSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            item = GameLogicService.equip_item(
                request.user,
                str(serializer.validated_data["player_item_id"]),
                serializer.validated_data["equip_slot"],
            )
            return Response({"ok": True, "equip_slot": item.equip_slot})
        except Exception as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class UnequipItemView(APIView):
    """Unequip the item in a given slot."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        equip_slot = request.data.get("equip_slot", "")
        if not equip_slot:
            return Response({"error": "equip_slot required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            GameLogicService.unequip_item(request.user, equip_slot)
            return Response({"ok": True})
        except Exception as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class CreateCharacterView(APIView):
    """
    One-time character creation: choose class, race, and faction.
    Sets class-specific base attributes (STR/AGI/INT/VIT) and
    derives initial max_health / max_mana from the same formulas
    used by the game server's AttributeCalculator.

    Returns 409 if the character has already been created.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CreateCharacterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            stats = GameLogicService.create_character(
                request.user,
                serializer.validated_data["character_class"],
                serializer.validated_data["race"],
                serializer.validated_data["faction"],
            )
            skills = PlayerSkill.objects.filter(owner=request.user)
            return Response(
                {
                    **PlayerStatsSerializer(stats).data,
                    "skills_granted": PlayerSkillSerializer(skills, many=True).data,
                },
                status=status.HTTP_201_CREATED,
            )
        except ValueError as exc:
            already_created = "already created" in str(exc)
            return Response(
                {"error": str(exc)},
                status=status.HTTP_409_CONFLICT if already_created else status.HTTP_400_BAD_REQUEST,
            )


class PartyView(APIView):
    """
    GET  party/         — returns the player's current active party (or 404)
    POST party/         — create a new party (player becomes leader)
    DELETE party/       — leave the current party (disbands if leader)
    POST party/invite/  — invite another player (leader only); body: {"user_id": "<uuid>"}
    """
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
    """POST party/invite/ — leader invites a player by user_id."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user_id = request.data.get("user_id")
        if not user_id:
            return Response({"error": "user_id required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            party = GameLogicService.invite_to_party(request.user, str(user_id))
            return Response({
                "id": str(party.id),
                "member_count": party.memberships.count(),
            })
        except Party.DoesNotExist:
            return Response({"error": "No active party found. Create one first."}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
