"""
Tests for game_logic views.
"""
from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.game_data.models import ItemTemplate, SkillTemplate


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
        response = self.client.get("/api/game-logic/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("inventory", payload)
        self.assertIn("stats", payload)

    def test_add_item_to_inventory_success(self):
        response = self.client.post(
            "/api/game-logic/inventory/",
            {"item_template_id": str(self.item.id), "quantity": 1},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_add_item_to_inventory_not_found(self):
        response = self.client.post(
            "/api/game-logic/inventory/",
            {"item_template_id": "11111111-1111-1111-1111-111111111111", "quantity": 1},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_remove_item_invalid_index_returns_400(self):
        response = self.client.delete("/api/game-logic/inventory/0/")
        self.assertEqual(response.status_code, 403)

    def test_learn_skill_success(self):
        response = self.client.post(
            "/api/game-logic/skills/",
            {"skill_template_id": str(self.skill.id)},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_learn_skill_not_found(self):
        response = self.client.post(
            "/api/game-logic/skills/",
            {"skill_template_id": "11111111-1111-1111-1111-111111111111"},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_allocate_points_requires_points_remaining(self):
        response = self.client.post(
            "/api/game-logic/stats/allocate/",
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
            "/api/game-logic/stats/allocate/",
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
            "/api/game-logic/inventory/",
            {"item_template_id": str(self.item.id), "quantity": 1},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertEqual(payload["slots_used"], 1)
        self.assertEqual(len(payload["items"]), 1)

    def test_add_item_to_inventory_not_found(self):
        response = self.client.post(
            "/api/game-logic/inventory/",
            {"item_template_id": "11111111-1111-1111-1111-111111111111", "quantity": 1},
            format="json",
        )
        self.assertEqual(response.status_code, 404)

    def test_remove_item_invalid_index_returns_400(self):
        response = self.client.delete("/api/game-logic/inventory/0/")
        self.assertEqual(response.status_code, 400)

    def test_learn_skill_success(self):
        response = self.client.post(
            "/api/game-logic/skills/",
            {"skill_template_id": str(self.skill.id)},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["current_level"], 1)

    def test_learn_skill_not_found(self):
        response = self.client.post(
            "/api/game-logic/skills/",
            {"skill_template_id": "11111111-1111-1111-1111-111111111111"},
            format="json",
        )
        self.assertEqual(response.status_code, 404)

    def test_gain_xp_requires_admin(self):
        response = self.client.post(
            "/api/game-logic/stats/gain-xp/",
            {"amount": 100},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["level"], 2)
