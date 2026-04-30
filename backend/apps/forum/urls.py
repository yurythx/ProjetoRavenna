"""
URL routes for forum app.
"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.forum.views import (
    ForumCategoryViewSet,
    PublicForumCategoryViewSet,
    PublicReplyViewSet,
    PublicTopicViewSet,
    ReplyReactionViewSet,
    ReplyViewSet,
    TopicReactionViewSet,
    TopicViewSet,
)

router = DefaultRouter()
router.register(r"categories", ForumCategoryViewSet, basename="forum-category")
router.register(r"topics", TopicViewSet, basename="forum-topic")
router.register(r"replies", ReplyViewSet, basename="forum-reply")
router.register(r"public/categories", PublicForumCategoryViewSet, basename="public-forum-category")
router.register(r"public/topics", PublicTopicViewSet, basename="public-forum-topic")
router.register(r"public/replies", PublicReplyViewSet, basename="public-forum-reply")
router.register(r"topic-reactions", TopicReactionViewSet, basename="topic-reaction")
router.register(r"reply-reactions", ReplyReactionViewSet, basename="reply-reaction")

urlpatterns = [
    path("", include(router.urls)),
]
