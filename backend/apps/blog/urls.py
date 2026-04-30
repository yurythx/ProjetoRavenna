"""
URL routes for blog app.
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.blog.views import (
    CategoryViewSet,
    CommentViewSet,
    MediaImageViewSet,
    PostViewSet,
    PublicCategoryViewSet,
    PublicCommentViewSet,
    PublicPostViewSet,
    PublicTagViewSet,
    TagViewSet,
)

router = DefaultRouter()
router.register(r"categories", CategoryViewSet, basename="category")
router.register(r"tags", TagViewSet, basename="tag")
router.register(r"posts", PostViewSet, basename="post")
router.register(r"articles", PostViewSet, basename="article")
router.register(r"public/posts", PublicPostViewSet, basename="public-posts")
router.register(r"public/categories", PublicCategoryViewSet, basename="public-categories")
router.register(r"public/tags", PublicTagViewSet, basename="public-tags")
router.register(r"public/comments", PublicCommentViewSet, basename="public-comments")
router.register(r"comments", CommentViewSet, basename="comments")
router.register(r"media/images", MediaImageViewSet, basename="media-images")

urlpatterns = [
    path("", include(router.urls)),
]
