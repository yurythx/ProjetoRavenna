from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from django.conf import settings
from django.conf.urls.static import static
from apps.accounts.profile_views import UserProfileView, AvatarUploadView
from apps.accounts.password_views import ChangePasswordView
from apps.core.stats_views import DashboardStatsView
from apps.core.notification_views import NotificationViewSet
from apps.core.module_views import AppModuleViewSet
from apps.core.views import health_check
from apps.core import sitemap_views
from rest_framework.routers import DefaultRouter
from apps.accounts.profile_views import AdminUserViewSet
from apps.accounts.profile_views import GroupViewSet, PermissionViewSet

# Create router for viewsets
router = DefaultRouter()
router.register(r'notifications', NotificationViewSet, basename='notifications')
router.register(r'modules', AppModuleViewSet, basename='modules')
router.register(r'users', AdminUserViewSet, basename='users')
router.register(r'auth/groups', GroupViewSet, basename='auth-groups')
router.register(r'auth/permissions', PermissionViewSet, basename='auth-permissions')

urlpatterns = [
    path("admin/", admin.site.urls),
    
    # Health check endpoint (for Docker health checks and monitoring)
    path("health/", health_check, name='health_check'),
    path("sitemap.xml", sitemap_views.tenant_sitemap, name='tenant_sitemap'),

    # Authentication
    path('api/v1/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/v1/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/v1/auth/profile/', UserProfileView.as_view(), name='user_profile'),
    path('api/v1/auth/profile/avatar/', AvatarUploadView.as_view(), name='avatar_upload'),
    path('api/v1/auth/change-password/', ChangePasswordView.as_view(), name='change_password'),

    # Stats
    path('api/v1/stats/dashboard/', DashboardStatsView.as_view(), name='dashboard_stats'),
    
    # Router (notifications, etc)
    path('api/v1/', include(router.urls)),

    # Modules
    # The middleware will check if these modules are active.
    path('api/v1/articles/', include('apps.articles.urls')),
    path('api/v1/entities/', include('apps.entities.urls')),
    
    # Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
