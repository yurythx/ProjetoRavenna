from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api import ArticleViewSet, CategoryViewSet, UploadImageView
from .tag_views import TagViewSet
from .comment_views import CommentViewSet
from .search_views import ArticleSearchViewSet
from .like_views import LikeViewSet, FavoriteViewSet
from .analytics_views import ArticleAnalyticsViewSet

router = DefaultRouter()
router.register(r'posts', ArticleViewSet, basename='articles')
router.register(r'categories', CategoryViewSet, basename='categories')
router.register(r'tags', TagViewSet, basename='tags')
router.register(r'comments', CommentViewSet, basename='comments')
router.register(r'search', ArticleSearchViewSet, basename='article-search')
router.register(r'likes', LikeViewSet, basename='article-like')
router.register(r'favorites', FavoriteViewSet, basename='article-favorite')
router.register(r'analytics', ArticleAnalyticsViewSet, basename='article-analytics')

urlpatterns = [
    path('', include(router.urls)),
    path('uploads/', UploadImageView.as_view(), name='article_upload'),
]
