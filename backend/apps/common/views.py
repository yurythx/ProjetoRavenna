from django.core.cache import caches
from django.db import connections
from django.conf import settings
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthLiveView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"status": "ok"})


class HealthReadyView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        db_ok = True
        cache_ok = True

        try:
            conn = connections["default"]
            conn.ensure_connection()
        except Exception:
            db_ok = False

        try:
            cache = caches["default"]
            cache.set("__healthcheck__", "1", timeout=2)
            v = cache.get("__healthcheck__")
            cache_ok = v == "1"
        except Exception:
            cache_ok = False

        ok = db_ok and cache_ok
        return Response(
            {"status": "ok" if ok else "degraded", "db": db_ok, "cache": cache_ok},
            status=200 if ok else 503,
        )


class HealthVersionView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(
            {
                "version": getattr(settings, "APP_VERSION", None),
                "build_sha": getattr(settings, "APP_BUILD_SHA", None),
                "build_time": getattr(settings, "APP_BUILD_TIME", None),
            }
        )
