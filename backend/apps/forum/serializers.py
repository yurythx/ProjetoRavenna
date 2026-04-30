"""
Serializers for forum app.
"""
from rest_framework import serializers

from apps.forum.models import (
    ForumCategory,
    Topic,
    Reply,
    TopicReaction,
    ReplyReaction,
)


class ForumCategoryListSerializer(serializers.ModelSerializer):
    """Serializer for forum category list."""

    class Meta:
        model = ForumCategory
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "icon",
            "topic_count",
            "reply_count",
            "display_order",
            "is_active",
        ]
        read_only_fields = fields


class ForumCategoryDetailSerializer(serializers.ModelSerializer):
    """Serializer for forum category detail."""

    class Meta:
        model = ForumCategory
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "icon",
            "display_order",
            "is_active",
            "topic_count",
            "reply_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class ForumCategoryCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating forum category."""

    class Meta:
        model = ForumCategory
        fields = [
            "name",
            "slug",
            "description",
            "icon",
            "display_order",
            "is_active",
        ]

    def validate_slug(self, value):
        from django.core.validators import slug_re

        if not slug_re.match(value):
            raise serializers.ValidationError(
                "Slug can only contain letters, numbers, underscores and hyphens."
            )
        return value


class AuthorSerializer(serializers.Serializer):
    """Minimal author serializer for nested use."""

    id = serializers.UUIDField(read_only=True)
    username = serializers.CharField(read_only=True)
    display_name = serializers.CharField(read_only=True)


class TopicListSerializer(serializers.ModelSerializer):
    """Serializer for topic list."""

    author = AuthorSerializer(read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = Topic
        fields = [
            "id",
            "title",
            "slug",
            "author",
            "category",
            "category_name",
            "status",
            "reply_count",
            "view_count",
            "is_pinned",
            "is_locked",
            "last_reply_at",
            "last_reply_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class TopicDetailSerializer(serializers.ModelSerializer):
    """Serializer for topic detail."""

    author = AuthorSerializer(read_only=True)
    category = ForumCategoryListSerializer(read_only=True)
    last_reply_by = AuthorSerializer(read_only=True)

    class Meta:
        model = Topic
        fields = [
            "id",
            "title",
            "slug",
            "content",
            "author",
            "category",
            "status",
            "reply_count",
            "view_count",
            "is_pinned",
            "is_locked",
            "last_reply_at",
            "last_reply_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class TopicCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating topics."""

    class Meta:
        model = Topic
        fields = [
            "title",
            "slug",
            "content",
            "category",
        ]

    def validate_slug(self, value):
        from django.core.validators import slug_re

        if not slug_re.match(value):
            raise serializers.ValidationError(
                "Slug can only contain letters, numbers, underscores and hyphens."
            )
        if Topic.objects.filter(slug=value).exists():
            raise serializers.ValidationError("A topic with this slug already exists.")
        return value

    def validate_title(self, value):
        from apps.common.html_sanitizer import sanitize_plain_text

        return sanitize_plain_text(value or "").strip()

    def validate_category(self, value):
        if not value.is_active:
            raise serializers.ValidationError("Cannot post to inactive category.")
        return value

    def validate_content(self, value):
        from apps.common.html_sanitizer import sanitize_html

        return sanitize_html(value)


class TopicUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating topics."""

    class Meta:
        model = Topic
        fields = ["title", "slug", "content"]

    def validate_slug(self, value):
        from django.core.validators import slug_re

        if not slug_re.match(value):
            raise serializers.ValidationError(
                "Slug can only contain letters, numbers, underscores and hyphens."
            )
        if Topic.objects.filter(slug=value).exclude(id=self.instance.id).exists():
            raise serializers.ValidationError("A topic with this slug already exists.")
        return value

    def validate_title(self, value):
        from apps.common.html_sanitizer import sanitize_plain_text

        return sanitize_plain_text(value or "").strip()

    def validate_content(self, value):
        from apps.common.html_sanitizer import sanitize_html

        return sanitize_html(value)


class ReplyListSerializer(serializers.ModelSerializer):
    """Serializer for reply list."""

    author = AuthorSerializer(read_only=True)
    reactions = serializers.SerializerMethodField()

    REACTION_TYPES = ["like", "dislike", "heart", "laugh", "wow"]

    class Meta:
        model = Reply
        fields = [
            "id",
            "content",
            "author",
            "topic",
            "is_solution",
            "is_hidden",
            "reactions",
            "edited_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_reactions(self, obj):
        summary = {r: 0 for r in self.REACTION_TYPES}
        for reaction in getattr(obj, "reactions", []).all():
            summary[reaction.reaction] = summary.get(reaction.reaction, 0) + 1
        return summary


class ReplyDetailSerializer(serializers.ModelSerializer):
    """Serializer for reply detail."""

    author = AuthorSerializer(read_only=True)
    topic_title = serializers.CharField(source="topic.title", read_only=True)

    class Meta:
        model = Reply
        fields = [
            "id",
            "content",
            "author",
            "topic",
            "topic_title",
            "is_solution",
            "is_hidden",
            "hidden_reason",
            "edited_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class ReplyCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating replies."""

    class Meta:
        model = Reply
        fields = ["content", "topic"]

    def validate_content(self, value):
        from apps.common.html_sanitizer import sanitize_html

        return sanitize_html(value)


class ReplyUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating replies."""

    class Meta:
        model = Reply
        fields = ["content"]

    def validate_content(self, value):
        from apps.common.html_sanitizer import sanitize_html

        return sanitize_html(value)

    def update(self, instance, validated_data):
        from django.utils import timezone

        instance = super().update(instance, validated_data)
        instance.edited_at = timezone.now()
        instance.save(update_fields=["edited_at", "updated_at"])
        return instance


class TopicReactionSerializer(serializers.ModelSerializer):
    """Serializer for topic reactions."""

    user = AuthorSerializer(read_only=True)

    class Meta:
        model = TopicReaction
        fields = [
            "id",
            "user",
            "topic",
            "reaction",
            "created_at",
        ]
        read_only_fields = fields


class ReplyReactionSerializer(serializers.ModelSerializer):
    """Serializer for reply reactions."""

    user = AuthorSerializer(read_only=True)

    class Meta:
        model = ReplyReaction
        fields = [
            "id",
            "user",
            "reply",
            "reaction",
            "created_at",
        ]
        read_only_fields = fields


class ReactionInputSerializer(serializers.Serializer):
    """Serializer for adding reactions."""

    reaction = serializers.ChoiceField(choices=TopicReaction.ReactionType.choices)


class TopicWithRepliesSerializer(serializers.ModelSerializer):
    """Serializer for topic with all replies."""

    author = AuthorSerializer(read_only=True)
    replies = ReplyListSerializer(many=True, read_only=True)
    reactions = serializers.SerializerMethodField()

    class Meta:
        model = Topic
        fields = [
            "id",
            "title",
            "slug",
            "content",
            "author",
            "category",
            "status",
            "reply_count",
            "view_count",
            "is_pinned",
            "is_locked",
            "last_reply_at",
            "last_reply_by",
            "replies",
            "reactions",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_reactions(self, obj):
        from django.db.models import Count

        reactions = obj.reactions.values("reaction").annotate(count=Count("id"))
        return {r["reaction"]: r["count"] for r in reactions}
