"""
Views for blog app.
"""
from uuid import UUID

from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from PIL import Image
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

from apps.accounts.permissions import IsGameUser
from apps.blog.models import Category, Comment, MediaImage, Post, PostRevision, PostView, Tag
from apps.blog.permissions import IsBlogEditor
from apps.blog.serializers import (
    CategoryCreateSerializer,
    CategorySerializer,
    CommentCreateSerializer,
    CommentListSerializer,
    MediaImageSerializer,
    ModerationCommentCreateSerializer,
    ModerationCommentSerializer,
    PostAdminSerializer,
    PostCreateSerializer,
    PostDetailSerializer,
    PostListSerializer,
    PostRevisionSerializer,
    PostUpdateSerializer,
    PublicPostDetailSerializer,
    PublicPostListSerializer,
    TagSerializer,
)
from apps.blog.services import PostService


class StandardPagination(PageNumberPagination):
    page_size_query_param = "page_size"
    max_page_size = 100


class CategoryViewSet(viewsets.ModelViewSet):
    """ViewSet for categories."""

    queryset = Category.objects.all()
    permission_classes = [IsBlogEditor]
    throttle_classes = [AnonRateThrottle, UserRateThrottle]
    pagination_class = None

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return CategoryCreateSerializer
        return CategorySerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]
        return [IsBlogEditor()]

    def get_queryset(self):
        if self.action in ["list", "retrieve"]:
            return (
                Category.objects.filter(is_active=True)
                .annotate(
                    post_count=Count(
                        "posts",
                        filter=Q(posts__status=Post.Status.PUBLISHED, posts__is_public=True),
                        distinct=True,
                    )
                )
                .order_by("display_order", "name")
            )
        return Category.objects.all()

    @action(detail=False, methods=["get"])
    def all(self, request):
        categories = Category.objects.filter(is_active=True).order_by("display_order", "name")
        serializer = CategorySerializer(categories, many=True)
        return Response(serializer.data)


class TagViewSet(viewsets.ModelViewSet):
    """ViewSet for tags."""

    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    lookup_field = "slug"
    throttle_classes = [AnonRateThrottle, UserRateThrottle]
    pagination_class = None

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]
        return [IsBlogEditor()]

    def get_queryset(self):
        qs = Tag.objects.all().order_by("name")
        user = getattr(self.request, "user", None)
        is_editor = bool(
            user
            and getattr(user, "is_authenticated", False)
            and (
                getattr(user, "is_blog_editor", False)
                or getattr(user, "is_staff", False)
                or getattr(user, "is_superuser", False)
            )
        )
        if not is_editor:
            qs = qs.filter(posts__status=Post.Status.PUBLISHED, posts__is_public=True).distinct()
        return qs


class PostViewSet(viewsets.ModelViewSet):
    """ViewSet for blog posts."""

    queryset = Post.objects.all()
    lookup_field = "slug"
    lookup_value_regex = r"[\w-]+"
    pagination_class = StandardPagination
    throttle_classes = [AnonRateThrottle, UserRateThrottle]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]
        if self.action in ["featured", "by_category", "by_tag", "search"]:
            return [AllowAny()]
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsBlogEditor()]
        return [IsBlogEditor()]

    def _get_page_params(self, *, default_page: int = 1, default_page_size: int = 20):
        raw_page = self.request.query_params.get("page", default_page)
        raw_page_size = self.request.query_params.get("page_size", default_page_size)
        try:
            page = int(raw_page)
            page_size = int(raw_page_size)
        except Exception:
            return None, None, Response({"error": "page and page_size must be integers."}, status=status.HTTP_400_BAD_REQUEST)
        if page < 1:
            return None, None, Response({"error": "page must be >= 1."}, status=status.HTTP_400_BAD_REQUEST)
        if page_size < 1:
            return None, None, Response({"error": "page_size must be >= 1."}, status=status.HTTP_400_BAD_REQUEST)
        if page_size > 100:
            page_size = 100
        return page, page_size, None

    def get_serializer_class(self):
        user = getattr(self.request, "user", None)
        is_editor = self._is_editor(user)
        if self.action == "list":
            return PostListSerializer if is_editor else PublicPostListSerializer
        elif self.action == "retrieve":
            return PostDetailSerializer if is_editor else PublicPostDetailSerializer
        elif self.action in ["featured", "by_category", "by_tag", "search", "my_drafts"]:
            return PostListSerializer if is_editor else PublicPostListSerializer
        elif self.action == "create":
            return PostCreateSerializer
        elif self.action in ["update", "partial_update"]:
            return PostUpdateSerializer
        elif self.action == "admin_list":
            return PostAdminSerializer
        return PostDetailSerializer

    def _is_editor(self, user) -> bool:
        return bool(
            user
            and getattr(user, "is_authenticated", False)
            and (
                getattr(user, "is_blog_editor", False)
                or getattr(user, "is_staff", False)
                or getattr(user, "is_superuser", False)
            )
        )

    def get_queryset(self):
        user = self.request.user
        qs = Post.objects.select_related("author", "category").prefetch_related("tags")

        is_editor = self._is_editor(user)
        if not is_editor:
            qs = qs.filter(status=Post.Status.PUBLISHED)
            if not user.is_authenticated:
                qs = qs.filter(is_public=True)

        params = self.request.query_params
        slug = params.get("slug")
        if slug:
            qs = qs.filter(slug=slug)

        status_param = params.get("status")
        if status_param:
            if is_editor:
                qs = qs.filter(status=status_param)
            elif status_param == Post.Status.PUBLISHED:
                qs = qs.filter(status=Post.Status.PUBLISHED)

        category = params.get("category")
        if category:
            try:
                qs = qs.filter(category_id=category)
            except Exception:
                qs = qs.filter(category__slug=category)

        tag = params.get("tag")
        if tag:
            try:
                UUID(str(tag))
                qs = qs.filter(tags__id=tag).distinct()
            except Exception:
                qs = qs.filter(tags__slug=tag).distinct()

        search = params.get("search") or params.get("q")
        if search:
            s = search.strip()
            if s:
                qs = qs.filter(Q(title__icontains=s) | Q(content__icontains=s) | Q(excerpt__icontains=s))

        ordering = params.get("ordering")
        if ordering:
            allowed = {"updated_at", "created_at", "published_at", "title", "view_count", "status"}
            fields = []
            for part in ordering.split(","):
                p = part.strip()
                if not p:
                    continue
                key = p[1:] if p.startswith("-") else p
                if key in allowed:
                    fields.append(p)
            if fields:
                qs = qs.order_by(*fields)

        return qs

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()

        user = request.user
        is_editor = self._is_editor(user)
        if instance.status != Post.Status.PUBLISHED and not is_editor:
            return Response({"error": "Post not found."}, status=status.HTTP_404_NOT_FOUND)
        if not is_editor and not user.is_authenticated and not bool(instance.is_public):
            return Response({"error": "Post not found."}, status=status.HTTP_404_NOT_FOUND)

        ip = (
            request.META.get("HTTP_CF_CONNECTING_IP")
            or (request.META.get("HTTP_X_FORWARDED_FOR") or "").split(",")[0].strip()
            or request.META.get("REMOTE_ADDR")
        )
        instance.increment_view()
        PostView.objects.create(
            post=instance,
            ip_address=ip,
            user=request.user if request.user.is_authenticated else None,
        )
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def featured(self, request):
        posts = self.get_queryset().filter(is_featured=True).order_by("-published_at", "-created_at")[:5]
        serializer = self.get_serializer(posts, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def by_category(self, request):
        category_slug = request.query_params.get("slug")
        if not category_slug:
            return Response(
                {"error": "Category slug is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        page, page_size, err = self._get_page_params()
        if err:
            return err

        offset = (page - 1) * page_size
        qs = self.get_queryset().filter(category__slug=category_slug).order_by("-published_at", "-created_at")
        posts = qs[offset:offset + page_size]
        serializer = self.get_serializer(posts, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def by_tag(self, request):
        tag_slug = request.query_params.get("slug")
        if not tag_slug:
            return Response(
                {"error": "Tag slug is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        page, page_size, err = self._get_page_params()
        if err:
            return err

        offset = (page - 1) * page_size
        qs = self.get_queryset().filter(tags__slug=tag_slug).distinct().order_by("-published_at", "-created_at")
        posts = qs[offset:offset + page_size]
        serializer = self.get_serializer(posts, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def search(self, request):
        query = request.query_params.get("q", "")
        if not query:
            return Response(
                {"error": "Search query is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        page, page_size, err = self._get_page_params()
        if err:
            return err

        offset = (page - 1) * page_size
        q = str(query).strip()
        qs = self.get_queryset()
        if q:
            qs = qs.filter(Q(title__icontains=q) | Q(content__icontains=q) | Q(excerpt__icontains=q))
        qs = qs.order_by("-published_at", "-created_at")
        posts = qs[offset:offset + page_size]
        serializer = self.get_serializer(posts, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def my_drafts(self, request):
        if not request.user.is_authenticated:
            return Response(
                {"error": "Authentication required."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 20))

        posts = PostService.get_drafts_by_author(request.user, page, page_size)
        serializer = PostListSerializer(posts, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def publish(self, request, slug=None):
        post = self.get_object()

        try:
            PostService._create_revision(post=post, user=request.user, comment="Published (pre)")
            PostService.publish_post(post)
            PostService._create_revision(post=post, user=request.user, comment="Published")
            return Response({"message": "Post published successfully."})
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def submit(self, request, slug=None):
        post = self.get_object()
        if post.status not in [Post.Status.DRAFT, Post.Status.REJECTED]:
            return Response({"error": "Only draft/rejected posts can be submitted."}, status=status.HTTP_400_BAD_REQUEST)
        PostService._create_revision(post=post, user=request.user, comment="Submitted (pre)")
        post.submit_for_review()
        PostService._create_revision(post=post, user=request.user, comment="Submitted")
        return Response({"message": "Post submitted for review."})

    @action(detail=True, methods=["post"])
    def reject(self, request, slug=None):
        post = self.get_object()
        reason = ""
        if isinstance(request.data, dict):
            reason = str(request.data.get("reason") or "").strip()
        if post.status != Post.Status.PENDING:
            return Response({"error": "Only pending posts can be rejected."}, status=status.HTTP_400_BAD_REQUEST)
        PostService._create_revision(post=post, user=request.user, comment="Rejected (pre)")
        post.reject(reason=reason)
        PostService._create_revision(post=post, user=request.user, comment="Rejected")
        return Response({"message": "Post rejected."})

    @action(detail=True, methods=["post"])
    def archive(self, request, slug=None):
        post = self.get_object()
        PostService.archive_post(post)
        return Response({"message": "Post archived successfully."})

    @action(detail=True, methods=["post"])
    def unpublish(self, request, slug=None):
        post = self.get_object()
        post.unpublish()
        return Response({"message": "Post unpublished successfully."})

    @action(detail=False, methods=["get"])
    def admin_all(self, request):
        if not (request.user.is_authenticated and request.user.is_blog_editor):
            return Response(
                {"error": "Permission denied."},
                status=status.HTTP_403_FORBIDDEN
            )

        posts = Post.objects.all().select_related("author", "category")
        serializer = PostAdminSerializer(posts, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], permission_classes=[IsBlogEditor])
    def analytics(self, request):
        now = timezone.now()
        thirty_days_ago = now - timezone.timedelta(days=30)
        fifteen_days_ago = now.date() - timezone.timedelta(days=15)

        total_articles = Post.objects.count()
        total_views = PostView.objects.count()

        most_viewed_qs = (
            Post.objects.annotate(
                total_views=Count("views"),
                views_last_30_days=Count("views", filter=Q(views__viewed_at__gte=thirty_days_ago)),
            )
            .order_by("-total_views")[:5]
        )

        most_viewed = [
            {
                "id": str(p.id),
                "title": p.title,
                "slug": p.slug,
                "total_views": int(getattr(p, "total_views", 0) or 0),
                "views_last_30_days": int(getattr(p, "views_last_30_days", 0) or 0),
            }
            for p in most_viewed_qs
        ]

        views_by_date_qs = (
            PostView.objects.filter(viewed_at__date__gte=fifteen_days_ago)
            .annotate(date=TruncDate("viewed_at"))
            .values("date")
            .annotate(count=Count("id"))
            .order_by("date")
        )
        views_by_date = [{"date": str(r["date"]), "count": int(r["count"])} for r in views_by_date_qs]

        return Response(
            {
                "total_articles": total_articles,
                "total_views": total_views,
                "most_viewed": most_viewed,
                "views_by_date": views_by_date,
            }
        )

    @action(detail=True, methods=["get"], permission_classes=[IsBlogEditor])
    def history(self, request, slug=None):
        post = self.get_object()
        qs = PostRevision.objects.filter(post=post).select_related("user").order_by("-created_at", "-id")[:100]
        data = [
            {
                "id": r.id,
                "created_at": r.created_at,
                "user": (r.user.username if r.user_id else "System"),
                "comment": r.comment or "",
            }
            for r in qs
        ]
        serializer = PostRevisionSerializer(data, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], permission_classes=[IsBlogEditor])
    def revert(self, request, slug=None):
        post = self.get_object()
        version_id = None
        if isinstance(request.data, dict):
            version_id = request.data.get("version_id")
        try:
            version_id_int = int(version_id)
        except Exception:
            return Response({"error": "version_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            PostService.revert_to_revision(user=request.user, post=post, revision_id=version_id_int)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"message": "Post reverted successfully."})

    @action(detail=False, methods=["post"], url_path="bulk/publish", permission_classes=[IsBlogEditor])
    def bulk_publish(self, request):
        slugs = []
        if isinstance(request.data, dict):
            slugs = request.data.get("slugs") or []
        if not isinstance(slugs, list) or not all(isinstance(s, str) and s for s in slugs):
            return Response({"error": "slugs must be a non-empty list of strings."}, status=status.HTTP_400_BAD_REQUEST)

        qs = Post.objects.filter(slug__in=slugs)
        updated = 0
        for post in qs:
            if post.status in [Post.Status.PENDING, Post.Status.DRAFT, Post.Status.REJECTED]:
                PostService._create_revision(post=post, user=request.user, comment="Bulk publish (pre)")
                post.publish()
                PostService._create_revision(post=post, user=request.user, comment="Bulk publish")
                updated += 1
        return Response({"updated": updated})

    @action(detail=False, methods=["post"], url_path="bulk/reject", permission_classes=[IsBlogEditor])
    def bulk_reject(self, request):
        slugs = []
        reason = ""
        if isinstance(request.data, dict):
            slugs = request.data.get("slugs") or []
            reason = str(request.data.get("reason") or "").strip()
        if not isinstance(slugs, list) or not all(isinstance(s, str) and s for s in slugs):
            return Response({"error": "slugs must be a non-empty list of strings."}, status=status.HTTP_400_BAD_REQUEST)

        qs = Post.objects.filter(slug__in=slugs)
        updated = 0
        for post in qs:
            if post.status == Post.Status.PENDING:
                PostService._create_revision(post=post, user=request.user, comment="Bulk reject (pre)")
                post.reject(reason=reason)
                PostService._create_revision(post=post, user=request.user, comment="Bulk reject")
                updated += 1
        return Response({"updated": updated})


class PublicPostViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PublicPostListSerializer
    permission_classes = [AllowAny]
    lookup_field = "slug"
    lookup_value_regex = r"[\w-]+"
    pagination_class = StandardPagination
    throttle_classes = [AnonRateThrottle, UserRateThrottle]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return PublicPostDetailSerializer
        return PublicPostListSerializer

    def get_queryset(self):
        qs = Post.objects.filter(status=Post.Status.PUBLISHED, is_public=True).select_related("author", "category").prefetch_related("tags")

        params = self.request.query_params

        slug = params.get("slug")
        if slug:
            qs = qs.filter(slug=slug)

        category = params.get("category")
        if category:
            try:
                qs = qs.filter(category_id=category)
            except Exception:
                qs = qs.filter(category__slug=category)

        tag = params.get("tag")
        if tag:
            try:
                UUID(str(tag))
                qs = qs.filter(tags__id=tag).distinct()
            except Exception:
                qs = qs.filter(tags__slug=tag).distinct()

        search = params.get("search") or params.get("q")
        if search:
            s = search.strip()
            if s:
                qs = qs.filter(Q(title__icontains=s) | Q(content__icontains=s) | Q(excerpt__icontains=s))

        ordering = params.get("ordering")
        if ordering:
            allowed = {"updated_at", "created_at", "published_at", "title", "view_count"}
            fields = []
            for part in ordering.split(","):
                p = part.strip()
                if not p:
                    continue
                key = p[1:] if p.startswith("-") else p
                if key in allowed:
                    fields.append(p)
            if fields:
                qs = qs.order_by(*fields)

        return qs

    @action(detail=False, methods=["get"])
    def featured(self, request):
        posts = self.get_queryset().filter(is_featured=True).order_by("-published_at", "-created_at")[:5]
        serializer = self.get_serializer(posts, many=True)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        ip = (
            request.META.get("HTTP_CF_CONNECTING_IP")
            or (request.META.get("HTTP_X_FORWARDED_FOR") or "").split(",")[0].strip()
            or request.META.get("REMOTE_ADDR")
        )
        instance.increment_view()
        PostView.objects.create(
            post=instance,
            ip_address=ip,
            user=request.user if request.user.is_authenticated else None,
        )
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class PublicCommentViewSet(viewsets.GenericViewSet):
    queryset = Comment.objects.select_related("author", "post").filter(
        is_public=True,
        is_approved=True,
        post__status=Post.Status.PUBLISHED,
        post__is_public=True,
    )
    permission_classes = [AllowAny]
    pagination_class = StandardPagination
    throttle_classes = [AnonRateThrottle, UserRateThrottle]

    def get_permissions(self):
        if self.action in ["list", "replies"]:
            return [AllowAny()]
        if self.action == "create":
            return [IsGameUser()]
        return super().get_permissions()

    def list(self, request):
        post_slug = request.query_params.get("post_slug") or request.query_params.get("article_slug")
        post_id = request.query_params.get("post") or request.query_params.get("article")
        if not post_slug and not post_id:
            return Response({"error": "post/article or post_slug/article_slug is required."}, status=status.HTTP_400_BAD_REQUEST)

        qs = self.get_queryset().filter(parent__isnull=True)
        if post_slug:
            qs = qs.filter(post__slug=post_slug)
        if post_id:
            qs = qs.filter(post_id=post_id)

        page = self.paginate_queryset(qs.order_by("-created_at"))
        if page is not None:
            serializer = CommentListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = CommentListSerializer(qs.order_by("-created_at")[:100], many=True)
        return Response(serializer.data)

    def create(self, request):
        data = request.data.copy() if hasattr(request.data, "copy") else dict(request.data)
        if "article" in data and "post" not in data:
            data["post"] = data.get("article")
        if "article_slug" in data and "post_slug" not in data:
            data["post_slug"] = data.get("article_slug")

        serializer = CommentCreateSerializer(data=data, context={"request": request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            comment = serializer.save()
        except PermissionError as e:
            return Response({"error": str(e)}, status=status.HTTP_403_FORBIDDEN)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(CommentListSerializer(comment).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="replies")
    def replies(self, request, pk=None):
        parent = self.get_object()
        qs = Comment.objects.select_related("author").filter(parent=parent, is_public=True, is_approved=True).order_by("-created_at")
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = CommentListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = CommentListSerializer(qs[:100], many=True)
        return Response(serializer.data)


class PublicCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]
    pagination_class = None
    throttle_classes = [AnonRateThrottle, UserRateThrottle]

    def get_queryset(self):
        return (
            Category.objects.filter(is_active=True)
            .annotate(
                post_count=Count(
                    "posts",
                    filter=Q(posts__status=Post.Status.PUBLISHED, posts__is_public=True),
                    distinct=True,
                )
            )
            .order_by("display_order", "name")
        )


class PublicTagViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [AllowAny]
    pagination_class = None
    lookup_field = "slug"
    throttle_classes = [AnonRateThrottle, UserRateThrottle]

    def get_queryset(self):
        return Tag.objects.filter(posts__status=Post.Status.PUBLISHED, posts__is_public=True).distinct().order_by("name")


class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.select_related("author", "post").all()
    serializer_class = ModerationCommentSerializer
    permission_classes = [IsBlogEditor]
    pagination_class = StandardPagination

    def get_queryset(self):
        qs = self.queryset
        params = self.request.query_params

        article = params.get("article") or params.get("post")
        if article:
            qs = qs.filter(post_id=article)

        parent_isnull = params.get("parent__isnull")
        if parent_isnull in ["true", "false"]:
            qs = qs.filter(parent__isnull=(parent_isnull == "true"))

        is_public = params.get("is_public")
        if is_public in ["true", "false"]:
            qs = qs.filter(is_public=(is_public == "true"))

        is_approved = params.get("is_approved")
        if is_approved in ["true", "false"]:
            qs = qs.filter(is_approved=(is_approved == "true"))

        created_at_gte = params.get("created_at__gte")
        if created_at_gte:
            qs = qs.filter(created_at__gte=created_at_gte)
        created_at_lte = params.get("created_at__lte")
        if created_at_lte:
            qs = qs.filter(created_at__lte=created_at_lte)

        search = params.get("search")
        if search:
            s = search.strip()
            if s:
                qs = qs.filter(
                    Q(content__icontains=s)
                    | Q(name__icontains=s)
                    | Q(email__icontains=s)
                    | Q(post__title__icontains=s)
                    | Q(post__slug__icontains=s)
                )

        ordering = params.get("ordering") or "-created_at"
        allowed = {"created_at", "updated_at", "is_public", "is_approved"}
        fields = []
        for part in ordering.split(","):
            p = (part or "").strip()
            if not p:
                continue
            key = p[1:] if p.startswith("-") else p
            if key in allowed:
                fields.append(p)
        qs = qs.order_by(*(fields or ["-created_at"]))
        return qs

    def create(self, request, *args, **kwargs):
        from apps.common.html_sanitizer import sanitize_plain_text

        serializer = ModerationCommentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        article_id = serializer.validated_data["article"]
        content = sanitize_plain_text(serializer.validated_data["content"] or "")

        comment = Comment.objects.create(
            post_id=article_id,
            author=request.user,
            content=content,
            is_public=False,
            is_approved=True,
        )
        return Response(ModerationCommentSerializer(comment).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def replies(self, request, pk=None):
        parent = self.get_object()
        qs = Comment.objects.select_related("author", "post").filter(parent=parent).order_by("-created_at")
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(ModerationCommentSerializer(page, many=True).data)
        return Response(ModerationCommentSerializer(qs[:100], many=True).data)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        comment = self.get_object()
        comment.is_approved = True
        comment.save(update_fields=["is_approved"])
        return Response({"status": "approved"})

    @action(detail=True, methods=["post"])
    def disapprove(self, request, pk=None):
        comment = self.get_object()
        comment.is_approved = False
        comment.save(update_fields=["is_approved"])
        return Response({"status": "disapproved"})

    def _thread_qs(self, root: Comment):
        return Comment.objects.filter(Q(id=root.id) | Q(parent=root))

    @action(detail=True, methods=["post"])
    def approve_thread(self, request, pk=None):
        root = self.get_object()
        updated = self._thread_qs(root).update(is_approved=True)
        return Response({"updated": updated})

    @action(detail=True, methods=["post"])
    def disapprove_thread(self, request, pk=None):
        root = self.get_object()
        updated = self._thread_qs(root).update(is_approved=False)
        return Response({"updated": updated})

    @action(detail=True, methods=["post"])
    def delete_thread(self, request, pk=None):
        root = self.get_object()
        deleted, _ = self._thread_qs(root).delete()
        return Response({"deleted": deleted})

    @action(detail=False, methods=["post"])
    def bulk_approve(self, request):
        ids = (request.data or {}).get("ids") if isinstance(request.data, dict) else None
        if not isinstance(ids, list) or not ids:
            return Response({"error": "ids is required."}, status=status.HTTP_400_BAD_REQUEST)
        updated = Comment.objects.filter(id__in=ids).update(is_approved=True)
        return Response({"updated": updated})

    @action(detail=False, methods=["post"])
    def bulk_disapprove(self, request):
        ids = (request.data or {}).get("ids") if isinstance(request.data, dict) else None
        if not isinstance(ids, list) or not ids:
            return Response({"error": "ids is required."}, status=status.HTTP_400_BAD_REQUEST)
        updated = Comment.objects.filter(id__in=ids).update(is_approved=False)
        return Response({"updated": updated})

    @action(detail=False, methods=["post"])
    def bulk_delete(self, request):
        ids = (request.data or {}).get("ids") if isinstance(request.data, dict) else None
        if not isinstance(ids, list) or not ids:
            return Response({"error": "ids is required."}, status=status.HTTP_400_BAD_REQUEST)
        deleted, _ = Comment.objects.filter(id__in=ids).delete()
        return Response({"deleted": deleted})

    def _apply_filtered(self, payload: dict):
        qs = Comment.objects.all()
        article = payload.get("article") or payload.get("post")
        if article:
            qs = qs.filter(post_id=article)
        if payload.get("is_public") in [True, False]:
            qs = qs.filter(is_public=payload["is_public"])
        if payload.get("is_approved") in [True, False]:
            qs = qs.filter(is_approved=payload["is_approved"])
        if payload.get("parent__isnull") in [True, False]:
            qs = qs.filter(parent__isnull=payload["parent__isnull"])
        search = (payload.get("search") or "").strip()
        if search:
            qs = qs.filter(
                Q(content__icontains=search)
                | Q(name__icontains=search)
                | Q(email__icontains=search)
                | Q(post__title__icontains=search)
                | Q(post__slug__icontains=search)
            )
        if payload.get("created_at__gte"):
            qs = qs.filter(created_at__gte=payload["created_at__gte"])
        if payload.get("created_at__lte"):
            qs = qs.filter(created_at__lte=payload["created_at__lte"])
        include_replies = bool(payload.get("include_replies"))
        if include_replies and payload.get("parent__isnull") is True:
            roots = list(qs.values_list("id", flat=True))
            qs = Comment.objects.filter(Q(id__in=roots) | Q(parent_id__in=roots))
        return qs

    @action(detail=False, methods=["post"])
    def bulk_approve_filtered(self, request):
        payload = request.data if isinstance(request.data, dict) else {}
        updated = self._apply_filtered(payload).update(is_approved=True)
        return Response({"updated": updated})

    @action(detail=False, methods=["post"])
    def bulk_disapprove_filtered(self, request):
        payload = request.data if isinstance(request.data, dict) else {}
        updated = self._apply_filtered(payload).update(is_approved=False)
        return Response({"updated": updated})

    @action(detail=False, methods=["post"])
    def bulk_delete_filtered(self, request):
        payload = request.data if isinstance(request.data, dict) else {}
        deleted, _ = self._apply_filtered(payload).delete()
        return Response({"deleted": deleted})

    @action(detail=False, methods=["post"])
    def bulk_filtered_count(self, request):
        payload = request.data if isinstance(request.data, dict) else {}
        qs = self._apply_filtered(payload)
        count = qs.count()
        sample = list(qs.values("id", "content")[:10])
        sample_items = [{"id": str(x["id"]), "content": (x["content"] or "")[:160]} for x in sample]
        return Response({"count": count, "sample_items": sample_items})


class MediaImageViewSet(viewsets.GenericViewSet):
    permission_classes = [IsBlogEditor]
    pagination_class = StandardPagination

    def list(self, request):
        qs = MediaImage.objects.all().order_by("-created_at")
        page = self.paginate_queryset(qs)
        items = page if page is not None else qs[:50]
        data = [
            {"id": str(it.id), "url": request.build_absolute_uri(it.image.url), "created_at": it.created_at}
            for it in items
        ]
        if page is not None:
            return self.get_paginated_response(MediaImageSerializer(data, many=True).data)
        return Response(MediaImageSerializer(data, many=True).data)

    def create(self, request):
        f = request.FILES.get("file")
        if not f:
            return Response({"error": "file is required."}, status=status.HTTP_400_BAD_REQUEST)

        max_bytes = 5 * 1024 * 1024
        if getattr(f, "size", 0) and f.size > max_bytes:
            return Response({"error": "file is too large."}, status=status.HTTP_400_BAD_REQUEST)
        content_type = (getattr(f, "content_type", "") or "").lower()
        allowed_types = {"image/jpeg", "image/png", "image/webp", "image/gif"}
        if content_type and content_type not in allowed_types:
            return Response({"error": "unsupported file type."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            f.seek(0)
            img = Image.open(f)
            img.verify()
        except Exception:
            return Response({"error": "invalid image file."}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            try:
                f.seek(0)
            except Exception:
                pass

        item = MediaImage.objects.create(image=f)
        return Response(
            {"id": str(item.id), "url": request.build_absolute_uri(item.image.url), "created_at": item.created_at},
            status=status.HTTP_201_CREATED,
        )
