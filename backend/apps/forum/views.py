"""
Views for forum app.
"""
from uuid import UUID

from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

from apps.accounts.permissions import IsNotBanned, IsVerified
from apps.forum.models import ForumCategory, Reply, Topic, TopicReaction, ReplyReaction
from apps.forum.permissions import (
    CanCreateReply,
    CanCreateTopic,
    IsForumModerator,
    IsReplyAuthorOrModerator,
    IsTopicAuthorOrModerator,
)
from apps.forum.serializers import (
    ForumCategoryCreateSerializer,
    ForumCategoryDetailSerializer,
    ForumCategoryListSerializer,
    ReactionInputSerializer,
    ReplyCreateSerializer,
    ReplyDetailSerializer,
    ReplyListSerializer,
    ReplyReactionSerializer,
    ReplyUpdateSerializer,
    TopicCreateSerializer,
    TopicDetailSerializer,
    TopicListSerializer,
    TopicReactionSerializer,
    TopicUpdateSerializer,
    TopicWithRepliesSerializer,
)
from apps.forum.services import ForumCategoryService, ReactionService, TopicService


class StandardPagination(PageNumberPagination):
    page_size_query_param = "page_size"
    max_page_size = 100


class ForumCategoryViewSet(viewsets.ModelViewSet):
    """ViewSet for forum categories."""

    queryset = ForumCategory.objects.all()
    permission_classes = [IsForumModerator]
    throttle_classes = [AnonRateThrottle, UserRateThrottle]
    serializer_class = ForumCategoryListSerializer
    lookup_field = "slug"
    pagination_class = StandardPagination

    def get_permissions(self):
        if self.action == "list":
            return [AllowAny()]
        if self.action == "retrieve":
            return [AllowAny()]
        return [IsForumModerator()]

    def get_serializer_class(self):
        if self.action == "list":
            return ForumCategoryListSerializer
        if self.action == "retrieve":
            return ForumCategoryDetailSerializer
        if self.action in ["create", "update", "partial_update"]:
            return ForumCategoryCreateSerializer
        return ForumCategoryListSerializer

    def get_queryset(self):
        if self.action in ["list", "retrieve"]:
            return ForumCategory.objects.filter(is_active=True)
        return ForumCategory.objects.all()

    def create(self, request):
        serializer = ForumCategoryCreateSerializer(data=request.data)
        if serializer.is_valid():
            category = ForumCategoryService.create_category(
                name=serializer.validated_data["name"],
                slug=serializer.validated_data["slug"],
                description=serializer.validated_data.get("description", ""),
                icon=serializer.validated_data.get("icon", ""),
                display_order=serializer.validated_data.get("display_order", 0),
                is_active=serializer.validated_data.get("is_active", True),
            )
            return Response(
                ForumCategoryDetailSerializer(category).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["get"])
    def all(self, request):
        """Get all categories including inactive."""
        categories = ForumCategory.objects.all()
        serializer = ForumCategoryDetailSerializer(categories, many=True)
        return Response(serializer.data)


class TopicViewSet(viewsets.ModelViewSet):
    """ViewSet for forum topics."""

    queryset = Topic.objects.all()
    permission_classes = [IsAuthenticated]
    throttle_classes = [AnonRateThrottle, UserRateThrottle]
    serializer_class = TopicListSerializer
    lookup_field = "slug"
    pagination_class = StandardPagination

    def get_permissions(self):
        if self.action == "list":
            return [AllowAny()]
        if self.action == "retrieve":
            return [AllowAny()]
        if self.action in ["with_replies", "reactions"]:
            return [AllowAny()]
        if self.action in ["create"]:
            return [CanCreateTopic()]
        if self.action in ["pin", "unpin", "close", "open", "archive"]:
            return [IsForumModerator()]
        if self.action in ["update", "partial_update", "destroy"]:
            return [IsTopicAuthorOrModerator()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == "list":
            return TopicListSerializer
        if self.action == "retrieve":
            return TopicDetailSerializer
        if self.action == "create":
            return TopicCreateSerializer
        if self.action in ["update", "partial_update"]:
            return TopicUpdateSerializer
        if self.action == "retrieve_with_replies":
            return TopicWithRepliesSerializer
        return TopicListSerializer

    def get_queryset(self):
        queryset = Topic.objects.select_related("author", "category", "last_reply_by")
        if self.action == "list":
            queryset = queryset.filter(category__is_active=True)
            category = self.request.query_params.get("category")
            if category:
                q = Q(category__slug=category)
                try:
                    UUID(str(category))
                except ValueError:
                    pass
                else:
                    q |= Q(category_id=category)
                queryset = queryset.filter(q)
            return queryset
        if self.action in ["retrieve", "with_replies", "reactions"]:
            topic = queryset.filter(slug=self.kwargs.get("slug"), category__is_active=True).first()
            if topic:
                topic.increment_view_count()
            return queryset.filter(slug=self.kwargs.get("slug"), category__is_active=True)
        return queryset

    def create(self, request):
        serializer = TopicCreateSerializer(data=request.data)
        if serializer.is_valid():
            try:
                topic = TopicService.create_topic(
                    title=serializer.validated_data["title"],
                    slug=serializer.validated_data["slug"],
                    content=serializer.validated_data["content"],
                    category=serializer.validated_data["category"],
                    author=request.user,
                )
                return Response(
                    TopicDetailSerializer(topic).data,
                    status=status.HTTP_201_CREATED,
                )
            except ValueError as e:
                return Response(
                    {"error": str(e)},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["get"])
    def with_replies(self, request, slug=None):
        include_hidden = request.query_params.get("include_hidden") in ["1", "true", "True", "yes", "on"]
        if include_hidden and not IsForumModerator().has_permission(request, self):
            return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        topic = get_object_or_404(self.get_queryset())

        replies_qs = Reply.objects.select_related("author").filter(topic=topic).order_by("created_at")
        if not include_hidden:
            replies_qs = replies_qs.filter(is_hidden=False)

        page = self.paginate_queryset(replies_qs)
        if page is not None:
            topic_data = TopicDetailSerializer(topic, context={"request": request}).data
            replies_data = ReplyListSerializer(page, many=True, context={"request": request}).data
            return Response(
                {
                    "count": self.paginator.page.paginator.count,
                    "next": self.paginator.get_next_link(),
                    "previous": self.paginator.get_previous_link(),
                    "topic": topic_data,
                    "replies": replies_data,
                }
            )

        serializer = TopicWithRepliesSerializer(topic, context={"request": request})
        data = serializer.data
        data["replies"] = ReplyListSerializer(replies_qs[:100], many=True, context={"request": request}).data
        return Response(data)

    @action(detail=True, methods=["post"], permission_classes=[IsForumModerator])
    def pin(self, request, slug=None):
        """Pin a topic."""
        topic = self.get_object()
        topic.pin()
        return Response({"message": "Topic pinned."})

    @action(detail=True, methods=["post"], permission_classes=[IsForumModerator])
    def unpin(self, request, slug=None):
        """Unpin a topic."""
        topic = self.get_object()
        topic.unpin()
        return Response({"message": "Topic unpinned."})

    @action(detail=True, methods=["post"], permission_classes=[IsForumModerator])
    def close(self, request, slug=None):
        """Close a topic."""
        topic = self.get_object()
        topic.close()
        return Response({"message": "Topic closed."})

    @action(detail=True, methods=["post"], permission_classes=[IsForumModerator])
    def open(self, request, slug=None):
        """Open a topic."""
        topic = self.get_object()
        topic.open()
        return Response({"message": "Topic opened."})

    @action(detail=True, methods=["post"], permission_classes=[IsForumModerator])
    def archive(self, request, slug=None):
        """Archive a topic."""
        topic = self.get_object()
        topic.archive()
        return Response({"message": "Topic archived."})

    @action(detail=True, methods=["get"])
    def reactions(self, request, slug=None):
        """Get topic reactions."""
        topic = self.get_object()
        reactions = ReactionService.get_topic_reactions(topic)
        return Response(reactions)

    @action(detail=False, methods=["get"])
    def popular(self, request):
        """Get popular topics."""
        limit = int(request.query_params.get("limit", 5))
        topics = TopicService.get_popular_topics(limit=limit)
        serializer = TopicListSerializer(topics, many=True, context={"request": request})
        return Response(serializer.data)

    def perform_destroy(self, instance):
        TopicService.delete_topic(instance)


class ReplyViewSet(viewsets.ModelViewSet):
    """ViewSet for forum replies."""

    queryset = Reply.objects.all()
    permission_classes = [IsAuthenticated]
    throttle_classes = [AnonRateThrottle, UserRateThrottle]
    serializer_class = ReplyListSerializer
    pagination_class = StandardPagination

    def get_permissions(self):
        if self.action == "list":
            include_hidden = self.request.query_params.get("include_hidden")
            if include_hidden in ["1", "true", "True", "yes", "on"]:
                return [IsForumModerator()]
            return [AllowAny()]
        if self.action == "retrieve":
            return [AllowAny()]
        if self.action == "create":
            return [CanCreateReply()]
        if self.action == "react":
            return [IsAuthenticated(), IsNotBanned(), IsVerified()]
        if self.action in ["update", "partial_update", "destroy"]:
            return [IsReplyAuthorOrModerator()]
        if self.action in ["mark_solution", "unmark_solution", "hide", "unhide"]:
            return [IsForumModerator()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == "list":
            return ReplyListSerializer
        if self.action == "retrieve":
            return ReplyDetailSerializer
        if self.action == "create":
            return ReplyCreateSerializer
        if self.action in ["update", "partial_update"]:
            return ReplyUpdateSerializer
        return ReplyListSerializer

    def get_queryset(self):
        queryset = Reply.objects.select_related("author", "topic")
        queryset = queryset.prefetch_related("reactions")
        if self.action == "list":
            include_hidden = self.request.query_params.get("include_hidden")
            if include_hidden not in ["1", "true", "True", "yes", "on"]:
                queryset = queryset.filter(is_hidden=False)
            topic_slug = self.request.query_params.get("topic")
            if topic_slug:
                queryset = queryset.filter(topic__slug=topic_slug)
            return queryset
        if self.action not in ["hide", "unhide", "mark_solution", "unmark_solution"]:
            queryset = queryset.filter(is_hidden=False)
        return queryset

    def create(self, request):
        serializer = ReplyCreateSerializer(data=request.data)
        if serializer.is_valid():
            try:
                reply = TopicService.create_reply(
                    content=serializer.validated_data["content"],
                    topic=serializer.validated_data["topic"],
                    author=request.user,
                )
                return Response(
                    ReplyDetailSerializer(reply).data,
                    status=status.HTTP_201_CREATED,
                )
            except ValueError as e:
                return Response(
                    {"error": str(e)},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def perform_destroy(self, instance):
        TopicService.delete_reply(instance)

    @action(detail=True, methods=["post"], permission_classes=[IsForumModerator])
    def mark_solution(self, request, pk=None):
        """Mark reply as solution."""
        reply = self.get_object()
        TopicService.mark_reply_as_solution(reply)
        return Response({"message": "Reply marked as solution."})

    @action(detail=True, methods=["post"], permission_classes=[IsForumModerator])
    def unmark_solution(self, request, pk=None):
        """Unmark reply as solution."""
        reply = self.get_object()
        reply.unmark_solution()
        return Response({"message": "Solution unmarked."})

    @action(detail=True, methods=["post"], permission_classes=[IsForumModerator])
    def hide(self, request, pk=None):
        """Hide a reply."""
        from apps.common.html_sanitizer import sanitize_plain_text

        reply = self.get_object()
        reason = sanitize_plain_text(request.data.get("reason", "") or "")
        reply.hide(reason)
        return Response({"message": "Reply hidden."})

    @action(detail=True, methods=["post"], permission_classes=[IsForumModerator])
    def unhide(self, request, pk=None):
        """Unhide a reply."""
        reply = self.get_object()
        reply.unhide()
        return Response({"message": "Reply unhidden."})

    @action(detail=True, methods=["post"])
    def react(self, request, pk=None):
        """Add reaction to reply."""
        reply = self.get_object()
        serializer = ReactionInputSerializer(data=request.data)
        if serializer.is_valid():
            try:
                reaction = ReactionService.add_reply_reaction(
                    reply=reply,
                    user=request.user,
                    reaction=serializer.validated_data["reaction"],
                )
                return Response(
                    ReplyReactionSerializer(reaction).data,
                    status=status.HTTP_201_CREATED,
                )
            except ValueError as e:
                return Response(
                    {"error": str(e)},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PublicForumCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ForumCategory.objects.all()
    permission_classes = [AllowAny]
    serializer_class = ForumCategoryListSerializer
    lookup_field = "slug"
    pagination_class = StandardPagination
    throttle_classes = [AnonRateThrottle, UserRateThrottle]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ForumCategoryDetailSerializer
        return ForumCategoryListSerializer

    def get_queryset(self):
        return ForumCategory.objects.filter(is_active=True)


class PublicTopicViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Topic.objects.select_related("author", "category", "last_reply_by").filter(category__is_active=True)
    permission_classes = [AllowAny]
    serializer_class = TopicListSerializer
    lookup_field = "slug"
    pagination_class = StandardPagination
    throttle_classes = [AnonRateThrottle, UserRateThrottle]

    def get_serializer_class(self):
        if self.action == "list":
            return TopicListSerializer
        if self.action == "retrieve":
            return TopicDetailSerializer
        return TopicListSerializer

    def get_queryset(self):
        queryset = Topic.objects.select_related("author", "category", "last_reply_by").filter(category__is_active=True)
        if self.action == "list":
            category = self.request.query_params.get("category")
            if category:
                q = Q(category__slug=category)
                try:
                    UUID(str(category))
                except ValueError:
                    pass
                else:
                    q |= Q(category_id=category)
                queryset = queryset.filter(q)

            search = self.request.query_params.get("search") or self.request.query_params.get("q")
            if search:
                s = str(search).strip()
                if s:
                    queryset = queryset.filter(Q(title__icontains=s) | Q(content__icontains=s))

            ordering = self.request.query_params.get("ordering")
            if ordering:
                allowed = {"created_at", "updated_at", "last_reply_at", "reply_count", "view_count", "title"}
                fields = []
                for part in str(ordering).split(","):
                    p = part.strip()
                    if not p:
                        continue
                    key = p[1:] if p.startswith("-") else p
                    if key in allowed:
                        fields.append(p)
                if fields:
                    queryset = queryset.order_by(*fields)

            return queryset
        if self.action in ["retrieve", "with_replies", "reactions"]:
            topic = queryset.filter(slug=self.kwargs.get("slug"), category__is_active=True).first()
            if topic:
                topic.increment_view_count()
            return queryset.filter(slug=self.kwargs.get("slug"), category__is_active=True)
        return queryset

    @action(detail=True, methods=["get"])
    def with_replies(self, request, slug=None):
        topic = get_object_or_404(self.get_queryset())

        replies_qs = Reply.objects.select_related("author").filter(topic=topic, is_hidden=False).order_by("created_at")
        page = self.paginate_queryset(replies_qs)
        if page is not None:
            topic_data = TopicDetailSerializer(topic, context={"request": request}).data
            replies_data = ReplyListSerializer(page, many=True, context={"request": request}).data
            return Response(
                {
                    "count": self.paginator.page.paginator.count,
                    "next": self.paginator.get_next_link(),
                    "previous": self.paginator.get_previous_link(),
                    "topic": topic_data,
                    "replies": replies_data,
                }
            )

        serializer = TopicWithRepliesSerializer(topic, context={"request": request})
        data = serializer.data
        data["replies"] = ReplyListSerializer(replies_qs[:100], many=True, context={"request": request}).data
        return Response(data)

    @action(detail=True, methods=["get"])
    def reactions(self, request, slug=None):
        topic = self.get_object()
        reactions = ReactionService.get_topic_reactions(topic)
        return Response(reactions)

    @action(detail=False, methods=["get"])
    def popular(self, request):
        """Get popular topics."""
        limit = int(request.query_params.get("limit", 5))
        topics = TopicService.get_popular_topics(limit=limit)
        serializer = TopicListSerializer(topics, many=True, context={"request": request})
        return Response(serializer.data)


class PublicReplyViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Reply.objects.select_related("author", "topic", "topic__category").filter(is_hidden=False)
    permission_classes = [AllowAny]
    serializer_class = ReplyListSerializer
    pagination_class = StandardPagination
    throttle_classes = [AnonRateThrottle, UserRateThrottle]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ReplyDetailSerializer
        return ReplyListSerializer

    def get_queryset(self):
        queryset = Reply.objects.select_related("author", "topic").prefetch_related("reactions").filter(is_hidden=False)
        topic_slug = self.request.query_params.get("topic")
        if topic_slug:
            queryset = queryset.filter(topic__slug=topic_slug)
        return queryset

    @action(detail=True, methods=["get"], permission_classes=[AllowAny])
    def reactions(self, request, pk=None):
        """Get reply reactions."""
        reply = self.get_object()
        return Response(ReactionService.get_reply_reactions(reply))


class TopicReactionViewSet(viewsets.ModelViewSet):
    """ViewSet for topic reactions."""

    queryset = TopicReaction.objects.all()
    permission_classes = [IsAuthenticated]
    serializer_class = TopicReactionSerializer
    http_method_names = ["post"]

    def create(self, request):
        if not request.user.is_active_and_not_banned or not request.user.is_verified:
            return Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        serializer = ReactionInputSerializer(data=request.data)
        if serializer.is_valid():
            topic_id = request.data.get("topic_id")
            if not topic_id:
                return Response(
                    {"error": "topic_id is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                topic = Topic.objects.get(id=topic_id)
            except Topic.DoesNotExist:
                return Response(
                    {"error": "Topic not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            try:
                reaction = ReactionService.add_topic_reaction(
                    topic=topic,
                    user=request.user,
                    reaction=serializer.validated_data["reaction"],
                )
                return Response(
                    TopicReactionSerializer(reaction).data,
                    status=status.HTTP_201_CREATED,
                )
            except ValueError as e:
                return Response(
                    {"error": str(e)},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ReplyReactionViewSet(viewsets.ModelViewSet):
    """ViewSet for reply reactions."""

    queryset = ReplyReaction.objects.all()
    permission_classes = [IsAuthenticated]
    serializer_class = ReplyReactionSerializer
    http_method_names = ["post"]

    def create(self, request):
        if not request.user.is_active_and_not_banned or not request.user.is_verified:
            return Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        serializer = ReactionInputSerializer(data=request.data)
        if serializer.is_valid():
            reply_id = request.data.get("reply_id")
            if not reply_id:
                return Response(
                    {"error": "reply_id is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                reply = Reply.objects.get(id=reply_id)
            except Reply.DoesNotExist:
                return Response(
                    {"error": "Reply not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            try:
                reaction = ReactionService.add_reply_reaction(
                    reply=reply,
                    user=request.user,
                    reaction=serializer.validated_data["reaction"],
                )
                return Response(
                    ReplyReactionSerializer(reaction).data,
                    status=status.HTTP_201_CREATED,
                )
            except ValueError as e:
                return Response(
                    {"error": str(e)},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
