"""
Serializers for blog app.
"""
from rest_framework import serializers

from apps.blog.models import Category, Comment, Post, Tag


class TagSerializer(serializers.ModelSerializer):
    """Serializer for tags."""

    class Meta:
        model = Tag
        fields = ["id", "name", "slug"]


class CategorySerializer(serializers.ModelSerializer):
    """Serializer for categories."""

    post_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "description", "display_order", "is_active", "post_count"]

    def get_post_count(self, obj):
        v = getattr(obj, "post_count", None)
        if v is not None:
            return int(v)
        return obj.posts.filter(status=Post.Status.PUBLISHED, is_public=True).count()


class CategoryCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating categories."""

    class Meta:
        model = Category
        fields = ["name", "slug", "description", "display_order", "is_active"]


class PostListSerializer(serializers.ModelSerializer):
    """Serializer for post list (lightweight)."""

    author_name = serializers.CharField(source="author.display_name", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    tags = serializers.SerializerMethodField()
    tag_slugs = serializers.SerializerMethodField()
    category_slug = serializers.SerializerMethodField()
    category_id = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            "id",
            "title",
            "slug",
            "excerpt",
            "author_name",
            "category_name",
            "category_slug",
            "category_id",
            "status",
            "is_public",
            "is_featured",
            "published_at",
            "created_at",
            "updated_at",
            "view_count",
            "read_time_minutes",
            "image",
            "tags",
            "tag_slugs",
        ]

    def get_tags(self, obj):
        return [tag.name for tag in obj.tags.all()]

    def get_tag_slugs(self, obj):
        return [tag.slug for tag in obj.tags.all()]

    def get_category_slug(self, obj):
        if not obj.category_id:
            return None
        return obj.category.slug

    def get_category_id(self, obj):
        if not obj.category_id:
            return None
        return str(obj.category_id)


class PublicPostListSerializer(PostListSerializer):
    class Meta(PostListSerializer.Meta):
        fields = [
            "id",
            "title",
            "slug",
            "excerpt",
            "author_name",
            "category_name",
            "category_slug",
            "category_id",
            "is_featured",
            "published_at",
            "created_at",
            "updated_at",
            "view_count",
            "read_time_minutes",
            "image",
            "tags",
            "tag_slugs",
        ]


class PostDetailSerializer(serializers.ModelSerializer):
    """Serializer for post detail."""

    author_name = serializers.CharField(source="author.display_name", read_only=True)
    author_email = serializers.SerializerMethodField()
    category = CategorySerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)

    class Meta:
        model = Post
        fields = [
            "id",
            "title",
            "slug",
            "excerpt",
            "content",
            "author_name",
            "author_email",
            "category",
            "tags",
            "status",
            "rejection_reason",
            "is_public",
            "is_featured",
            "published_at",
            "created_at",
            "updated_at",
            "view_count",
            "read_time_minutes",
            "image",
            "meta_title",
            "meta_description",
            "meta_keywords",
        ]

    def get_author_email(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
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
            return None
        if not getattr(obj, "author_id", None):
            return None
        return getattr(obj.author, "email", None)


class PublicPostDetailSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.display_name", read_only=True)
    category = CategorySerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)

    class Meta:
        model = Post
        fields = [
            "id",
            "title",
            "slug",
            "excerpt",
            "content",
            "author_name",
            "category",
            "tags",
            "is_featured",
            "published_at",
            "created_at",
            "updated_at",
            "view_count",
            "read_time_minutes",
            "image",
            "meta_title",
            "meta_description",
            "meta_keywords",
        ]


class PostCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating posts."""

    category = serializers.UUIDField(required=False, allow_null=True, write_only=True)
    tags = serializers.ListField(child=serializers.UUIDField(), required=False, write_only=True)
    tag_names = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        write_only=True,
    )
    category_id = serializers.UUIDField(required=False, write_only=True)

    class Meta:
        model = Post
        fields = [
            "title",
            "slug",
            "excerpt",
            "content",
            "category",
            "tags",
            "category_id",
            "tag_names",
            "status",
            "rejection_reason",
            "is_featured",
            "image",
            "meta_title",
            "meta_description",
            "meta_keywords",
        ]

    def validate_slug(self, value):
        if Post.objects.filter(slug=value).exists():
            raise serializers.ValidationError("A post with this slug already exists.")
        return value

    def validate_category_id(self, value):
        if value and not Category.objects.filter(id=value).exists():
            raise serializers.ValidationError("Category not found.")
        return value

    def create(self, validated_data):
        from apps.blog.services import PostService

        tag_names = validated_data.pop("tag_names", [])
        tag_ids = validated_data.pop("tags", None) or []
        category_id = validated_data.pop("category", None) or validated_data.pop("category_id", None)
        validated_data.pop("author", None)

        author = self.context["request"].user

        post = PostService.create_post(
            author=author,
            category_id=category_id,
            tag_ids=tag_ids,
            tag_names=tag_names,
            **validated_data
        )
        return post


class PostUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating posts."""

    category = serializers.UUIDField(required=False, allow_null=True, write_only=True)
    tags = serializers.ListField(child=serializers.UUIDField(), required=False, write_only=True)
    tag_names = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        write_only=True,
    )
    category_id = serializers.UUIDField(required=False, write_only=True)

    class Meta:
        model = Post
        fields = [
            "title",
            "slug",
            "excerpt",
            "content",
            "category",
            "tags",
            "category_id",
            "tag_names",
            "status",
            "rejection_reason",
            "is_featured",
            "image",
            "meta_title",
            "meta_description",
            "meta_keywords",
        ]

    def validate_slug(self, value):
        if Post.objects.filter(slug=value).exclude(id=self.instance.id).exists():
            raise serializers.ValidationError("A post with this slug already exists.")
        return value

    def validate_category_id(self, value):
        if value and not Category.objects.filter(id=value).exists():
            raise serializers.ValidationError("Category not found.")
        return value

    def update(self, instance, validated_data):
        from apps.blog.services import PostService

        tag_names = validated_data.pop("tag_names", None)
        tag_ids = validated_data.pop("tags", None)
        category_id = validated_data.pop("category", None) or validated_data.pop("category_id", None)

        validated_data["category_id"] = category_id
        if tag_names is not None:
            validated_data["tag_names"] = tag_names
        if tag_ids is not None:
            validated_data["tag_ids"] = tag_ids

        updated_by = self.context["request"].user
        return PostService.update_post(instance, validated_data, updated_by)


class PostAdminSerializer(serializers.ModelSerializer):
    """Serializer for admin post management."""

    author_name = serializers.CharField(source="author.display_name", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = Post
        fields = [
            "id",
            "uuid",
            "title",
            "slug",
            "author_name",
            "category_name",
            "status",
            "is_public",
            "is_featured",
            "published_at",
            "created_at",
            "updated_at",
            "view_count",
        ]
        read_only_fields = fields


class CommentListSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    reply_count = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = [
            "id",
            "content",
            "author_name",
            "name",
            "post",
            "parent",
            "is_public",
            "is_approved",
            "reply_count",
            "created_at",
        ]
        read_only_fields = fields

    def get_author_name(self, obj):
        if obj.author_id:
            return obj.author.display_name or obj.author.username
        return obj.name or None

    def get_reply_count(self, obj):
        return obj.replies.filter(is_public=True, is_approved=True).count()


class CommentCreateSerializer(serializers.ModelSerializer):
    post = serializers.PrimaryKeyRelatedField(queryset=Post.objects.all(), required=False)
    post_slug = serializers.SlugField(write_only=True, required=False)

    class Meta:
        model = Comment
        fields = ["post", "post_slug", "parent", "content", "name", "email", "website"]

    def validate(self, attrs):
        if not attrs.get("post") and not attrs.get("post_slug"):
            raise serializers.ValidationError("post or post_slug is required.")
        return attrs

    def create(self, validated_data):
        from apps.blog.services import CommentService

        request = self.context["request"]
        post_slug = validated_data.pop("post_slug", None)
        return CommentService.create_comment(
            author=request.user if request.user.is_authenticated else None,
            post=validated_data.get("post"),
            post_slug=post_slug,
            parent=validated_data.get("parent"),
            content=validated_data["content"],
            name=validated_data.get("name", ""),
            email=validated_data.get("email", ""),
            website=validated_data.get("website", ""),
        )


class ModerationCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.display_name", read_only=True)
    article = serializers.UUIDField(source="post_id", read_only=True)
    article_title = serializers.CharField(source="post.title", read_only=True)
    article_slug = serializers.CharField(source="post.slug", read_only=True)
    reply_count = serializers.IntegerField(source="replies.count", read_only=True)

    class Meta:
        model = Comment
        fields = [
            "id",
            "article",
            "article_title",
            "article_slug",
            "parent",
            "content",
            "created_at",
            "is_approved",
            "is_public",
            "author_name",
            "name",
            "email",
            "reply_count",
        ]
        read_only_fields = fields


class ModerationCommentCreateSerializer(serializers.Serializer):
    article = serializers.UUIDField()
    content = serializers.CharField()


class PostRevisionSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    user = serializers.CharField()
    comment = serializers.CharField()


class MediaImageSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    url = serializers.CharField()
    created_at = serializers.DateTimeField()
