"""
URL configuration for Projeto Ravenna project.
"""
from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

v1_urlpatterns = [
    path("accounts/", include("apps.accounts.urls")),
    path("blog/", include("apps.blog.urls")),
    path("forum/", include("apps.forum.urls")),
    path("game-data/", include("apps.game_data.urls")),
    path("game-logic/", include("apps.game_logic.urls")),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", include("apps.common.urls")),
    path("api/v1/", include((v1_urlpatterns, "v1"))),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/schema/swagger-ui/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path(
        "api/schema/redoc/",
        SpectacularRedocView.as_view(url_name="schema"),
        name="redoc",
    ),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
