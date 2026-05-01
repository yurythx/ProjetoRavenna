import hashlib
import hmac
import os

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.game_logic.models import PlayerInventory, PlayerSkill, PlayerStats, QuestProgress, QuestTemplate
from apps.game_logic.serializers import (
    AddItemSerializer,
    AllocatePointsSerializer,
    GainExperienceSerializer,
    LearnSkillSerializer,
    PlayerInventorySerializer,
    PlayerSkillSerializer,
    PlayerStatsSerializer,
    QuestProgressSerializer,
    QuestTemplateSerializer,
    UpdateStatsSerializer,
)
from apps.game_logic.services import GameLogicService

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


class QuestTemplatesView(APIView):
    """Public list of active quest templates — used by Unity and frontend."""
    permission_classes = [AllowAny]

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
    permission_classes = [AllowAny]
    authentication_classes = []

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
            print(f"[Webhook] Signature mismatch! Received: {signature}, Expected: {expected}")
            return Response({"error": "forbidden"}, status=status.HTTP_403_FORBIDDEN)

        print(f"[Webhook] Body: {body.decode()}")
        print(f"[Webhook] Data: {request.data}")

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
            amount = int(data.get("amount", 0))
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
            # Action IDs defined in proto C2S_Action:
            #   1 = melee_attack, 2 = ranged_attack, 3 = use_skill, 4 = pickup_item
            XP_PER_ACTION = {1: 5, 2: 5, 3: 10, 4: 2}
            xp = XP_PER_ACTION.get(action_id, 0)
            if xp:
                GameLogicService.gain_experience(target, xp)

        print(f"[Webhook] Event {event_type} processed for {target.email}")
        return Response({"ok": True})
