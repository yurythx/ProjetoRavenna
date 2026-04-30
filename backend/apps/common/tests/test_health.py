from django.test import TestCase
from rest_framework.test import APIClient


class HealthEndpointsTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_live(self):
        res = self.client.get("/api/health/live/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json().get("status"), "ok")

    def test_ready(self):
        res = self.client.get("/api/health/ready/")
        self.assertIn(res.status_code, [200, 503])
        payload = res.json()
        self.assertIn(payload.get("status"), ["ok", "degraded"])
        self.assertIn("db", payload)
        self.assertIn("cache", payload)

    def test_version(self):
        res = self.client.get("/api/health/version/")
        self.assertEqual(res.status_code, 200)
        payload = res.json()
        self.assertIn("version", payload)
        self.assertIn("build_sha", payload)
        self.assertIn("build_time", payload)
