import hashlib
import hmac
import os

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.game_logic.models import PlayerInventory, PlayerSkill, PlayerStats, QuestProgress
from apps.game_logic.serializers import (
    AddItemSerializer,
    AllocatePointsSerializer,
    GainExperienceSerializer,
    LearnSkillSerializer,
    PlayerInventorySerializer,
    PlayerSkillSerializer,
    PlayerStatsSerializer,
    QuestProgressSerializer,
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
                skill = GameLogicService.learn_skill(request.user, serializer.validated_data["skill_template_id"])
                return Response(PlayerSkillSerializer(skill).data, status=201)
            except Exception as e:
                return Response({"error": str(e)}, status=400)
        return Response(serializer.errors, status=400)


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
            amount = int(data.get("amount", 0))
            if amount > 0:
                GameLogicService.gain_experience(target, amount)

        elif event_type == "item_collected":
            item_id  = data.get("item_template_id")
            quantity = int(data.get("quantity", 1))
            if item_id:
                GameLogicService.add_item_to_inventory(target, item_id, quantity)

        elif event_type == "player_action":
            pass

        return Response({"ok": True})
