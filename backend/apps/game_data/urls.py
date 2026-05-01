"""
URL routes for game_data app.
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.game_data.views import (
    GameDataBootstrapView,
    GameDataManifestView,
    ItemTemplateViewSet,
    MapDataViewSet,
    SkillTemplateViewSet,
)

router = DefaultRouter()
router.register(r"items",  ItemTemplateViewSet,  basename="item-template")
router.register(r"skills", SkillTemplateViewSet, basename="skill-template")
router.register(r"maps",   MapDataViewSet)

urlpatterns = [
    path("manifest/", GameDataManifestView.as_view(), name="game-data-manifest"),
    path("bootstrap/", GameDataBootstrapView.as_view(), name="game-data-bootstrap"),
    path("", include(router.urls)),
]
