"""
Tests for game_data views.
"""
from django.test import TestCase

from apps.game_data.models import ItemTemplate, MapData, SkillTemplate


class GameDataViewsTestCase(TestCase):
    """Test cases for game_data endpoints."""

    def setUp(self):
        self.item = ItemTemplate.objects.create(
            name="Iron Sword",
            item_type="weapon",
            rarity="common",
            base_damage=10,
            stack_size=1,
        )
        self.skill = SkillTemplate.objects.create(
            name="Fireball",
            skill_type="magic",
            damage=25,
            mana_cost=10,
            cooldown=3.0,
        )
        self.map_enabled = MapData.objects.create(
            name="Starter Zone",
            map_key="starter_zone",
            min_level=1,
            max_level=10,
            is_enabled=True,
        )
        self.map_disabled = MapData.objects.create(
            name="Hidden Zone",
            map_key="hidden_zone",
            min_level=1,
            max_level=10,
            is_enabled=False,
        )

    def test_items_list_is_public(self):
        response = self.client.get("/api/v1/game-data/items/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        results = payload.get("results", payload)
        self.assertTrue(any(r["id"] == str(self.item.id) for r in results))

    def test_skills_list_is_public(self):
        response = self.client.get("/api/v1/game-data/skills/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        results = payload.get("results", payload)
        self.assertTrue(any(r["id"] == str(self.skill.id) for r in results))

    def test_maps_list_only_returns_enabled(self):
        response = self.client.get("/api/v1/game-data/maps/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        results = payload.get("results", payload)
        ids = [r["id"] for r in results]
        self.assertIn(str(self.map_enabled.id), ids)
        self.assertNotIn(str(self.map_disabled.id), ids)

    def test_manifest_returns_etag_and_supports_304(self):
        res1 = self.client.get("/api/v1/game-data/manifest/")
        self.assertEqual(res1.status_code, 200)
        etag = res1.headers.get("ETag")
        self.assertTrue(bool(etag))

        res2 = self.client.get("/api/v1/game-data/manifest/", HTTP_IF_NONE_MATCH=etag)
        self.assertEqual(res2.status_code, 304)

    def test_bootstrap_returns_all(self):
        res = self.client.get("/api/v1/game-data/bootstrap/")
        self.assertEqual(res.status_code, 200)
        payload = res.json()
        self.assertIn("items", payload)
        self.assertIn("skills", payload)
        self.assertIn("maps", payload)
        self.assertTrue(any(r["id"] == str(self.item.id) for r in payload["items"]))
        self.assertTrue(any(r["id"] == str(self.skill.id) for r in payload["skills"]))
        self.assertTrue(any(r["id"] == str(self.map_enabled.id) for r in payload["maps"]))
        self.assertFalse(any(r["id"] == str(self.map_disabled.id) for r in payload["maps"]))

    def test_bootstrap_supports_since_and_validation(self):
        res_bad = self.client.get("/api/v1/game-data/bootstrap/?since=not-a-date")
        self.assertEqual(res_bad.status_code, 400)

        from django.utils import timezone

        since = timezone.now().isoformat()
        # Use dict form so the test client URL-encodes the + in the timezone offset correctly
        res_ok = self.client.get("/api/v1/game-data/bootstrap/", {"since": since})
        self.assertEqual(res_ok.status_code, 200)
        payload = res_ok.json()
        self.assertEqual(payload["items"], [])
        self.assertEqual(payload["skills"], [])
        self.assertEqual(payload["maps"], [])
