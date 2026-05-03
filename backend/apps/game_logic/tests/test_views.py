"""
Tests for game_logic views.
"""
import hashlib
import hmac
import json

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.game_data.models import ItemTemplate, SkillTemplate
from apps.game_logic.models import PlayerInventory, PlayerSkill, PlayerStats, QuestTemplate


class GameLogicViewsTestCase(TestCase):
    """Test cases for game_logic endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="user@example.com",
            username="user",
            password="TestPass123!"
        )
        self.client.force_authenticate(user=self.user)

        self.item = ItemTemplate.objects.create(
            name="Iron Sword",
            item_type="weapon",
            rarity="common",
            stack_size=1,
        )
        self.skill = SkillTemplate.objects.create(
            name="Fireball",
            skill_type="magic",
            damage=25,
            mana_cost=10,
            cooldown=3.0,
        )

    def test_get_player_instances(self):
        response = self.client.get("/api/v1/game-logic/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("inventory", payload)
        self.assertIn("stats", payload)

    def test_add_item_to_inventory_success(self):
        response = self.client.post(
            "/api/v1/game-logic/inventory/",
            {"item_template_id": str(self.item.id), "quantity": 1},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_add_item_to_inventory_not_found(self):
        response = self.client.post(
            "/api/v1/game-logic/inventory/",
            {"item_template_id": "11111111-1111-1111-1111-111111111111", "quantity": 1},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_remove_item_invalid_index_returns_400(self):
        response = self.client.delete("/api/v1/game-logic/inventory/0/")
        self.assertEqual(response.status_code, 400)

    def test_learn_skill_success(self):
        response = self.client.post(
            "/api/v1/game-logic/skills/",
            {"skill_template_id": str(self.skill.id)},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_learn_skill_not_found(self):
        response = self.client.post(
            "/api/v1/game-logic/skills/",
            {"skill_template_id": "11111111-1111-1111-1111-111111111111"},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_allocate_points_requires_points_remaining(self):
        response = self.client.post(
            "/api/v1/game-logic/stats/allocate/",
            {"strength": 1},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_allocate_points_success(self):
        from apps.game_logic.models import PlayerStats

        stats, _ = PlayerStats.objects.get_or_create(owner=self.user)
        stats.points_remaining = 5
        stats.save(update_fields=["points_remaining", "updated_at"])

        response = self.client.post(
            "/api/v1/game-logic/stats/allocate/",
            {"strength": 2, "vitality": 3},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["points_remaining"], 0)


class GameLogicAdminViewsTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            email="admin@example.com",
            username="admin",
            password="AdminPass123!"
        )
        self.client.force_authenticate(user=self.admin)
        self.item = ItemTemplate.objects.create(
            name="Iron Sword",
            item_type="weapon",
            rarity="common",
            stack_size=1,
        )
        self.skill = SkillTemplate.objects.create(
            name="Fireball",
            skill_type="magic",
            damage=25,
            mana_cost=10,
            cooldown=3.0,
        )

    def test_add_item_to_inventory_success(self):
        response = self.client.post(
            "/api/v1/game-logic/inventory/",
            {"item_template_id": str(self.item.id), "quantity": 1},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertEqual(payload["slots_used"], 1)
        self.assertEqual(len(payload["items"]), 1)

    def test_add_item_to_inventory_not_found(self):
        response = self.client.post(
            "/api/v1/game-logic/inventory/",
            {"item_template_id": "11111111-1111-1111-1111-111111111111", "quantity": 1},
            format="json",
        )
        self.assertEqual(response.status_code, 404)

    def test_remove_item_invalid_index_returns_400(self):
        response = self.client.delete("/api/v1/game-logic/inventory/0/")
        self.assertEqual(response.status_code, 400)

    def test_learn_skill_success(self):
        response = self.client.post(
            "/api/v1/game-logic/skills/",
            {"skill_template_id": str(self.skill.id)},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["current_level"], 1)

    def test_learn_skill_not_found(self):
        response = self.client.post(
            "/api/v1/game-logic/skills/",
            {"skill_template_id": "11111111-1111-1111-1111-111111111111"},
            format="json",
        )
        self.assertEqual(response.status_code, 404)

    def test_gain_xp_requires_admin(self):
        response = self.client.post(
            "/api/v1/game-logic/stats/gain-xp/",
            {"amount": 100},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["level"], 2)

    def test_gain_xp_rejects_above_cap(self):
        response = self.client.post(
            "/api/v1/game-logic/stats/gain-xp/",
            {"amount": 99999},
            format="json",
        )
        self.assertEqual(response.status_code, 400)


# The view reads _SECRET once at class load via os.environ; default is "changeme"
_WEBHOOK_SECRET = "changeme"
_WEBHOOK_URL = "/api/v1/game-logic/events/"


def _sign(body_bytes: bytes, secret: str = _WEBHOOK_SECRET) -> str:
    return hmac.new(secret.encode(), body_bytes, hashlib.sha256).hexdigest()


class WebhookSecurityTestCase(TestCase):
    """Security tests for GameEventWebhookView."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="player@example.com",
            username="player",
            password="TestPass123!",
        )
        PlayerStats.objects.get_or_create(owner=self.user)

    def _post(self, payload: dict, secret: str = _WEBHOOK_SECRET) -> object:
        body = json.dumps(payload).encode()
        return self.client.post(
            _WEBHOOK_URL,
            data=body,
            content_type="application/json",
            HTTP_X_WEBHOOK_SECRET=_sign(body, secret),
        )

    def test_valid_signature_accepted(self):
        response = self._post({
            "event_type": "player_disconnected",
            "player_id": str(self.user.id),
            "data": {},
        })
        self.assertEqual(response.status_code, 200)

    def test_invalid_signature_rejected(self):
        body = json.dumps({
            "event_type": "xp_gained",
            "player_id": str(self.user.id),
            "data": {"amount": 100},
        }).encode()
        response = self.client.post(
            _WEBHOOK_URL,
            data=body,
            content_type="application/json",
            HTTP_X_WEBHOOK_SECRET="bad-signature",
        )
        self.assertEqual(response.status_code, 403)

    def test_xp_above_10000_is_capped(self):
        stats_before, _ = PlayerStats.objects.get_or_create(owner=self.user)
        xp_before = stats_before.experience

        response = self._post({
            "event_type": "xp_gained",
            "player_id": str(self.user.id),
            "data": {"amount": 999_999},
        })
        self.assertEqual(response.status_code, 200)
        stats_after = PlayerStats.objects.get(owner=self.user)
        self.assertLessEqual(stats_after.experience - xp_before, 10_000)

    def test_missing_event_type_returns_400(self):
        response = self._post({"player_id": str(self.user.id), "data": {}})
        self.assertEqual(response.status_code, 400)

    def test_unknown_player_returns_404(self):
        response = self._post({
            "event_type": "xp_gained",
            "player_id": "00000000-0000-0000-0000-000000000000",
            "data": {"amount": 100},
        })
        self.assertEqual(response.status_code, 404)


class QuestTemplatesAuthTestCase(TestCase):
    """QuestTemplatesView must require authentication."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="q@example.com",
            username="quser",
            password="TestPass123!",
        )
        QuestTemplate.objects.create(
            name="Test Quest",
            description="desc",
            quest_type="main",
            objectives={},
            rewards={"xp": 100},
            level_required=1,
        )

    def test_unauthenticated_gets_401(self):
        response = self.client.get("/api/v1/game-logic/quest-templates/")
        self.assertEqual(response.status_code, 401)

    def test_authenticated_gets_list(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/v1/game-logic/quest-templates/")
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.json()), 1)


class WebhookEventsTestCase(TestCase):
    """Tests for each webhook event type handled by GameEventWebhookView."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="hero@example.com",
            username="hero",
            password="TestPass123!",
        )
        self.other = User.objects.create_user(
            email="victim@example.com",
            username="victim",
            password="TestPass123!",
        )
        self.item = ItemTemplate.objects.create(
            name="Health Potion",
            item_type="consumable",
            rarity="common",
            stack_size=10,
        )
        PlayerStats.objects.get_or_create(owner=self.user)
        PlayerStats.objects.get_or_create(owner=self.other)

    def _post(self, payload: dict, secret: str = _WEBHOOK_SECRET):
        body = json.dumps(payload).encode()
        return self.client.post(
            _WEBHOOK_URL,
            data=body,
            content_type="application/json",
            HTTP_X_WEBHOOK_SECRET=_sign(body, secret),
        )

    def test_player_connected_returns_200(self):
        response = self._post({
            "event_type": "player_connected",
            "player_id": str(self.user.id),
            "data": {"hwid": "hw-1", "ip_address": "1.2.3.4", "map_key": "world_main"},
        })
        self.assertEqual(response.status_code, 200)

    def test_player_disconnected_saves_position(self):
        self._post({
            "event_type": "player_connected",
            "player_id": str(self.user.id),
            "data": {"hwid": "hw-1"},
        })
        response = self._post({
            "event_type": "player_disconnected",
            "player_id": str(self.user.id),
            "data": {"pos_x": 1234, "pos_y": 5678, "hp": 80},
        })
        self.assertEqual(response.status_code, 200)
        stats = PlayerStats.objects.get(owner=self.user)
        self.assertEqual(stats.last_pos_x, 1234)
        self.assertEqual(stats.last_pos_y, 5678)

    def test_player_disconnected_hp0_skips_position_save(self):
        stats = PlayerStats.objects.get(owner=self.user)
        stats.last_pos_x = 100
        stats.last_pos_y = 200
        stats.save(update_fields=["last_pos_x", "last_pos_y", "updated_at"])

        self._post({
            "event_type": "player_connected",
            "player_id": str(self.user.id),
            "data": {},
        })
        self._post({
            "event_type": "player_disconnected",
            "player_id": str(self.user.id),
            "data": {"pos_x": 9999, "pos_y": 9999, "hp": 0},
        })
        stats.refresh_from_db()
        self.assertEqual(stats.last_pos_x, 100)

    def test_player_action_melee_grants_xp(self):
        stats, _ = PlayerStats.objects.get_or_create(owner=self.user)
        xp_before = stats.experience

        response = self._post({
            "event_type": "player_action",
            "player_id": str(self.user.id),
            "data": {"action_id": 1},
        })
        self.assertEqual(response.status_code, 200)
        stats.refresh_from_db()
        self.assertGreater(stats.experience, xp_before)

    def test_item_collected_adds_to_inventory(self):
        response = self._post({
            "event_type": "item_collected",
            "player_id": str(self.user.id),
            "data": {"item_template_id": str(self.item.id), "quantity": 2},
        })
        self.assertEqual(response.status_code, 200)

    def test_player_killed_returns_200(self):
        response = self._post({
            "event_type": "player_killed",
            "player_id": str(self.user.id),
            "data": {"victim_user_id": str(self.other.id)},
        })
        self.assertEqual(response.status_code, 200)

    def test_quest_complete_returns_200(self):
        self.quest = QuestTemplate.objects.create(
            name="Webhook Quest",
            description="test",
            quest_type="side",
            objectives={},
            rewards={"xp": 50},
            level_required=1,
        )
        from apps.game_logic.services import GameLogicService as _svc
        _svc.start_quest(self.user, str(self.quest.id))

        response = self._post({
            "event_type": "quest_complete",
            "player_id": str(self.user.id),
            "data": {"quest_id": str(self.quest.id)},
        })
        self.assertEqual(response.status_code, 200)

    def test_quest_complete_nonexistent_quest_still_200(self):
        response = self._post({
            "event_type": "quest_complete",
            "player_id": str(self.user.id),
            "data": {"quest_id": "00000000-0000-0000-0000-000000000000"},
        })
        self.assertEqual(response.status_code, 200)

    def test_npc_killed_advances_quest_objective(self):
        quest = QuestTemplate.objects.create(
            name="Wolf Slayer",
            quest_type="side",
            objectives=[{"key": "kill_wolf", "description": "Kill wolves", "target_count": 3}],
            rewards={"xp": 100},
            level_required=1,
        )
        from apps.game_logic.services import GameLogicService as _svc
        from apps.game_logic.models import QuestProgress
        _svc.start_quest(self.user, str(quest.id))

        response = self._post({
            "event_type": "npc_killed",
            "player_id": str(self.user.id),
            "data": {"npc_type": "wolf", "npc_id": 100001, "pos_x": 500, "pos_y": 800},
        })
        self.assertEqual(response.status_code, 200)

        progress = QuestProgress.objects.get(owner=self.user, quest_id=str(quest.id))
        self.assertEqual(progress.current_objectives.get("kill_wolf"), 1)

    def test_npc_killed_autocompletes_when_target_reached(self):
        quest = QuestTemplate.objects.create(
            name="One Wolf",
            quest_type="side",
            objectives=[{"key": "kill_wolf", "description": "Kill a wolf", "target_count": 1}],
            rewards={"xp": 50},
            level_required=1,
        )
        from apps.game_logic.services import GameLogicService as _svc
        from apps.game_logic.models import QuestProgress
        _svc.start_quest(self.user, str(quest.id))

        self._post({
            "event_type": "npc_killed",
            "player_id": str(self.user.id),
            "data": {"npc_type": "wolf", "npc_id": 100002, "pos_x": 0, "pos_y": 0},
        })

        progress = QuestProgress.objects.get(owner=self.user, quest_id=str(quest.id))
        self.assertEqual(progress.status, "completed")

    def test_npc_killed_irrelevant_npc_type_ignored(self):
        quest = QuestTemplate.objects.create(
            name="Kill Bandits",
            quest_type="side",
            objectives=[{"key": "kill_bandit", "description": "Kill bandits", "target_count": 5}],
            rewards={},
            level_required=1,
        )
        from apps.game_logic.services import GameLogicService as _svc
        from apps.game_logic.models import QuestProgress
        _svc.start_quest(self.user, str(quest.id))

        self._post({
            "event_type": "npc_killed",
            "player_id": str(self.user.id),
            "data": {"npc_type": "wolf", "npc_id": 100003, "pos_x": 0, "pos_y": 0},
        })

        progress = QuestProgress.objects.get(owner=self.user, quest_id=str(quest.id))
        self.assertEqual(progress.current_objectives.get("kill_bandit", 0), 0)

    def test_unknown_event_type_returns_200(self):
        # Unrecognised events are silently ignored (no 400)
        response = self._post({
            "event_type": "some_future_event",
            "player_id": str(self.user.id),
            "data": {},
        })
        self.assertEqual(response.status_code, 200)


class WebhookThrottleTestCase(TestCase):
    """GameServerThrottle está aplicado nos endpoints server-to-server."""

    def test_webhook_has_gameserver_throttle(self):
        from apps.game_logic.views import GameEventWebhookView
        from apps.game_logic.throttles import GameServerThrottle
        self.assertIn(GameServerThrottle, GameEventWebhookView.throttle_classes)

    def test_game_state_has_gameserver_throttle(self):
        from apps.game_logic.views import GameStateView
        from apps.game_logic.throttles import GameServerThrottle
        self.assertIn(GameServerThrottle, GameStateView.throttle_classes)


class GameStateViewTestCase(TestCase):
    """Tests for GameStateView — server-to-server HMAC-authenticated GET."""

    _BASE = "/api/v1/game-logic/game-state/{}/"

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="state@example.com",
            username="stateuser",
            password="TestPass123!",
        )
        stats, _ = PlayerStats.objects.get_or_create(owner=self.user)
        stats.last_pos_x = 500
        stats.last_pos_y = 800
        stats.health = 75
        stats.max_health = 100
        stats.save(update_fields=["last_pos_x", "last_pos_y", "health", "max_health", "updated_at"])

    def _get(self, user_id: str, secret: str = _WEBHOOK_SECRET):
        sig = hmac.new(secret.encode(), user_id.encode(), hashlib.sha256).hexdigest()
        return self.client.get(
            self._BASE.format(user_id),
            HTTP_X_WEBHOOK_SECRET=sig,
        )

    def test_valid_request_returns_stats(self):
        response = self._get(str(self.user.id))
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["hp"], 75)
        self.assertEqual(payload["max_hp"], 100)
        self.assertEqual(payload["pos_x"], 500)
        self.assertEqual(payload["pos_y"], 800)

    def test_invalid_signature_returns_403(self):
        response = self._get(str(self.user.id), secret="wrong")
        self.assertEqual(response.status_code, 403)

    def test_unknown_user_returns_404(self):
        response = self._get("00000000-0000-0000-0000-000000000000")
        self.assertEqual(response.status_code, 404)

    @override_settings(GAMESERVER_ALLOWED_IPS=["10.0.0.1"])
    def test_blocked_ip_returns_403(self):
        response = self._get(str(self.user.id))
        # REMOTE_ADDR defaults to 127.0.0.1 in test client — not in whitelist
        self.assertEqual(response.status_code, 403)

    @override_settings(GAMESERVER_ALLOWED_IPS=["127.0.0.1"])
    def test_whitelisted_ip_allowed(self):
        response = self._get(str(self.user.id))
        self.assertEqual(response.status_code, 200)


class LeaderboardViewTestCase(TestCase):
    """Tests for LeaderboardView."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="lb@example.com",
            username="lbuser",
            password="TestPass123!",
        )
        self.client.force_authenticate(user=self.user)

    def test_returns_results_key(self):
        response = self.client.get("/api/v1/game-logic/leaderboard/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("results", response.json())

    def test_unauthenticated_gets_401(self):
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/v1/game-logic/leaderboard/")
        self.assertEqual(response.status_code, 401)

    def test_custom_limit_accepted(self):
        response = self.client.get("/api/v1/game-logic/leaderboard/?limit=3")
        self.assertEqual(response.status_code, 200)


class QuestProgressViewTestCase(TestCase):
    """Tests for QuestProgressView (GET and POST)."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="qp@example.com",
            username="qpuser",
            password="TestPass123!",
        )
        self.client.force_authenticate(user=self.user)
        self.quest = QuestTemplate.objects.create(
            name="Slay 5 Wolves",
            description="Hunt wolves in the forest.",
            quest_type="side",
            objectives={"wolf_kills": 5},
            rewards={"xp": 200},
            level_required=1,
        )

    def test_get_quests_initially_empty(self):
        response = self.client.get("/api/v1/game-logic/quests/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    def test_start_quest_returns_201(self):
        response = self.client.post(
            "/api/v1/game-logic/quests/",
            {"quest_id": str(self.quest.id)},
            format="json",
        )
        self.assertEqual(response.status_code, 201)

    def test_start_quest_missing_id_returns_400(self):
        response = self.client.post("/api/v1/game-logic/quests/", {}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_started_quest_appears_in_get(self):
        self.client.post(
            "/api/v1/game-logic/quests/",
            {"quest_id": str(self.quest.id)},
            format="json",
        )
        response = self.client.get("/api/v1/game-logic/quests/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)


class PlayerSkillsViewTestCase(TestCase):
    """Tests for PlayerSkillsView GET."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="skills@example.com",
            username="skillsuser",
            password="TestPass123!",
        )
        self.client.force_authenticate(user=self.user)

    def test_get_skills_initially_empty(self):
        response = self.client.get("/api/v1/game-logic/skills/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    def test_unauthenticated_gets_401(self):
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/v1/game-logic/skills/")
        self.assertEqual(response.status_code, 401)

    def test_non_admin_post_returns_403(self):
        response = self.client.post(
            "/api/v1/game-logic/skills/",
            {"skill_template_id": "11111111-1111-1111-1111-111111111111"},
            format="json",
        )
        self.assertEqual(response.status_code, 403)


class GameSessionViewTestCase(TestCase):
    """Tests for GameSessionView POST/DELETE."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="session@example.com",
            username="sessionuser",
            password="TestPass123!",
        )
        self.client.force_authenticate(user=self.user)

    def test_start_session_returns_201(self):
        response = self.client.post(
            "/api/v1/game-logic/session/",
            {"hwid": "hw-abc", "map_key": "world_main"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["status"], "session_started")

    def test_end_session_returns_200(self):
        self.client.post("/api/v1/game-logic/session/", {}, format="json")
        response = self.client.delete("/api/v1/game-logic/session/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "session_ended")

    def test_unauthenticated_gets_401(self):
        self.client.force_authenticate(user=None)
        response = self.client.post("/api/v1/game-logic/session/", {}, format="json")
        self.assertEqual(response.status_code, 401)


class UpgradeSkillViewTestCase(TestCase):
    """Tests for POST skills/<id>/upgrade/."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="upgrade@example.com",
            username="upgradeuser",
            password="TestPass123!",
        )
        self.client.force_authenticate(user=self.user)
        self.skill_template = SkillTemplate.objects.create(
            name="Fireball",
            skill_type="magic",
            damage=25,
            mana_cost=10,
            cooldown=3.0,
        )
        self.player_skill = PlayerSkill.objects.create(
            owner=self.user,
            skill_template=self.skill_template,
            current_level=1,
        )
        self.inv, _ = PlayerInventory.objects.get_or_create(owner=self.user)
        self.inv.gold = 1000
        self.inv.save()

    def test_upgrade_increases_level_and_deducts_gold(self):
        url = f"/api/v1/game-logic/skills/{self.player_skill.id}/upgrade/"
        response = self.client.post(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["current_level"], 2)
        self.inv.refresh_from_db()
        self.assertEqual(self.inv.gold, 900)  # cost = 1 * 100

    def test_upgrade_unauthenticated_returns_401(self):
        self.client.force_authenticate(user=None)
        url = f"/api/v1/game-logic/skills/{self.player_skill.id}/upgrade/"
        response = self.client.post(url)
        self.assertEqual(response.status_code, 401)

    def test_upgrade_another_users_skill_returns_400(self):
        other = User.objects.create_user(
            email="other@example.com", username="other", password="TestPass123!"
        )
        other_skill = PlayerSkill.objects.create(
            owner=other, skill_template=self.skill_template, current_level=1
        )
        url = f"/api/v1/game-logic/skills/{other_skill.id}/upgrade/"
        response = self.client.post(url)
        self.assertEqual(response.status_code, 400)

    def test_upgrade_without_gold_returns_400(self):
        self.inv.gold = 0
        self.inv.save()
        url = f"/api/v1/game-logic/skills/{self.player_skill.id}/upgrade/"
        response = self.client.post(url)
        self.assertEqual(response.status_code, 400)
        self.assertIn("gold", response.json()["error"].lower())
