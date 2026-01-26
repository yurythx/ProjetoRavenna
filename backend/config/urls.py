from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.articles.api import ArticleViewSet, CategoryViewSet, UploadImageView
from apps.entities.api import TenantConfigView
from django.conf import settings
from django.conf.urls.static import static

router = DefaultRouter()
router.register(r'articles', ArticleViewSet, basename='article')
router.register(r'categories', CategoryViewSet, basename='category')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include(router.urls)),
    path('api/v1/articles/upload', UploadImageView.as_view()),
    path('api/v1/entities/config/', TenantConfigView.as_view()),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
