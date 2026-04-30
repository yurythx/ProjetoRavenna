"""
Views for game_data app.
Read-only endpoints for Unity to consume at startup.
"""
import hashlib

from django.db.models import Count, Max
from django.utils.dateparse import parse_datetime
from django.utils.timezone import is_naive, make_aware
from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.game_data.models import ItemTemplate, MapData, SkillTemplate
from apps.game_data.serializers import (
    ItemTemplateSerializer,
    MapDataSerializer,
    SkillTemplateSerializer,
)


class ItemTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only viewset for item templates."""

    queryset = ItemTemplate.objects.all()
    serializer_class = ItemTemplateSerializer
    permission_classes = [AllowAny]


class SkillTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only viewset for skill templates."""

    queryset = SkillTemplate.objects.all()
    serializer_class = SkillTemplateSerializer
    permission_classes = [AllowAny]


class MapDataViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only viewset for map data."""

    queryset = MapData.objects.filter(is_enabled=True)
    serializer_class = MapDataSerializer
    permission_classes = [AllowAny]


class GameDataManifestView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        items = ItemTemplate.objects.aggregate(count=Count("id"), updated_at=Max("updated_at"))
        skills = SkillTemplate.objects.aggregate(count=Count("id"), updated_at=Max("updated_at"))
        maps = MapData.objects.filter(is_enabled=True).aggregate(count=Count("id"), updated_at=Max("updated_at"))

        payload = {
            "items": {
                "count": int(items["count"] or 0),
                "updated_at": items["updated_at"].isoformat() if items["updated_at"] else None,
            },
            "skills": {
                "count": int(skills["count"] or 0),
                "updated_at": skills["updated_at"].isoformat() if skills["updated_at"] else None,
            },
            "maps": {
                "count": int(maps["count"] or 0),
                "updated_at": maps["updated_at"].isoformat() if maps["updated_at"] else None,
            },
        }

        etag_base = f'{payload["items"]["count"]}:{payload["items"]["updated_at"]}|{payload["skills"]["count"]}:{payload["skills"]["updated_at"]}|{payload["maps"]["count"]}:{payload["maps"]["updated_at"]}'
        etag = hashlib.sha256(etag_base.encode("utf-8")).hexdigest()
        client_etag = (request.headers.get("If-None-Match") or "").strip().strip('"')
        if client_etag and client_etag == etag:
            return Response(status=304, headers={"ETag": f'"{etag}"', "Cache-Control": "public, max-age=60"})

        return Response(payload, headers={"ETag": f'"{etag}"', "Cache-Control": "public, max-age=60"})


_BOOTSTRAP_CACHE_KEY = "game_data:bootstrap:full"
_BOOTSTRAP_CACHE_TTL = 300  # 5 minutes


class GameDataBootstrapView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        since_raw = (request.query_params.get("since") or "").strip()
        since = None
        if since_raw:
            parsed = parse_datetime(since_raw)
            if not parsed:
                return Response({"error": "Invalid since datetime."}, status=400)
            since = make_aware(parsed) if is_naive(parsed) else parsed

        # Cache only the full (no filter) response — incremental loads bypass cache
        if not since:
            from django.core.cache import cache
            cached = cache.get(_BOOTSTRAP_CACHE_KEY)
            if cached is not None:
                return Response(cached, headers={"X-Cache": "HIT"})

        items_qs = ItemTemplate.objects.all()
        skills_qs = SkillTemplate.objects.all()
        maps_qs = MapData.objects.filter(is_enabled=True)
        if since:
            items_qs = items_qs.filter(updated_at__gt=since)
            skills_qs = skills_qs.filter(updated_at__gt=since)
            maps_qs = maps_qs.filter(updated_at__gt=since)

        payload = {
            "items": ItemTemplateSerializer(items_qs, many=True).data,
            "skills": SkillTemplateSerializer(skills_qs, many=True).data,
            "maps": MapDataSerializer(maps_qs, many=True).data,
        }

        if not since:
            from django.core.cache import cache
            cache.set(_BOOTSTRAP_CACHE_KEY, payload, timeout=_BOOTSTRAP_CACHE_TTL)

        return Response(payload, headers={"X-Cache": "MISS"})
