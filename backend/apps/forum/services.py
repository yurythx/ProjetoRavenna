"""
Service layer for forum operations.
"""
import uuid
from typing import Optional, List

from django.db import models, transaction
from django.db.models import QuerySet

from apps.forum.models import ForumCategory, Reply, Topic, TopicReaction, ReplyReaction


class ForumCategoryService:
    """Service for forum category operations."""

    @classmethod
    def create_category(
        cls,
        name: str,
        slug: str,
        description: str = "",
        display_order: int = 0,
        icon: str = "",
        is_active: bool = True,
    ) -> ForumCategory:
        """Create a new forum category."""
        return ForumCategory.objects.create(
            name=name,
            slug=slug,
            description=description,
            display_order=display_order,
            icon=icon,
            is_active=is_active,
        )

    @classmethod
    def get_all_active(cls) -> QuerySet:
        """Get all active categories."""
        return ForumCategory.objects.filter(is_active=True).order_by("display_order", "name")

    @classmethod
    def get_by_slug(cls, slug: str) -> Optional[ForumCategory]:
        """Get category by slug."""
        return ForumCategory.objects.filter(slug=slug).first()


class TopicService:
    """Service for topic operations."""

    @classmethod
    @transaction.atomic
    def create_topic(
        cls,
        title: str,
        content: str,
        author,
        category,
        slug: str = None,
    ) -> Topic:
        """Create a new topic."""
        from apps.common.html_sanitizer import sanitize_html, sanitize_plain_text

        if slug is None:
            slug = title.lower().replace(" ", "-")[:50]
        slug = (slug or "").strip()
        if not slug:
            raise ValueError("slug is required.")
        if Topic.objects.filter(slug=slug).exists():
            raise ValueError("A topic with this slug already exists.")

        topic = Topic.objects.create(
            title=sanitize_plain_text(title or "").strip(),
            slug=slug,
            content=sanitize_html(content),
            author=author,
            category=category,
        )

        ForumCategory.objects.select_for_update().filter(id=category.id).update(
            topic_count=models.F("topic_count") + 1
        )

        return topic

    @classmethod
    @transaction.atomic
    def create_reply(
        cls,
        topic: Topic,
        content: str,
        author,
    ) -> Reply:
        """Create a reply to a topic."""
        from apps.common.html_sanitizer import sanitize_html

        # Lock the topic for counter update
        topic = Topic.objects.select_for_update().get(id=topic.id)

        if topic.is_locked:
            raise ValueError("Cannot reply to a locked topic.")

        reply = Reply.objects.create(
            topic=topic,
            content=sanitize_html(content),
            author=author,
        )

        topic.increment_reply_count(reply_author=author)

        ForumCategory.objects.select_for_update().filter(id=topic.category_id).update(
            reply_count=models.F("reply_count") + 1
        )

        return reply

    @classmethod
    @transaction.atomic
    def delete_reply(cls, reply: Reply) -> None:
        """Delete a reply and update counters."""
        topic = reply.topic
        topic.decrement_reply_count()

        ForumCategory.objects.filter(id=topic.category_id).update(
            reply_count=models.F("reply_count") - 1
        )

        reply.delete()

    @classmethod
    @transaction.atomic
    def delete_topic(cls, topic: Topic) -> None:
        replies_count = Reply.objects.filter(topic=topic).count()
        ForumCategory.objects.filter(id=topic.category_id).update(
            topic_count=models.F("topic_count") - 1,
            reply_count=models.F("reply_count") - replies_count,
        )
        topic.delete()

    @classmethod
    def get_topic_by_slug(cls, slug: str) -> Optional[Topic]:
        """Get topic by slug."""
        return Topic.objects.select_related(
            "author", "category", "last_reply_by"
        ).prefetch_related("reactions").filter(slug=slug).first()

    @classmethod
    def get_topics_by_category(
        cls,
        category_slug: str,
        page: int = 1,
        page_size: int = 20,
    ) -> QuerySet:
        """Get topics by category."""
        offset = (page - 1) * page_size
        return Topic.objects.filter(
            category__slug=category_slug,
            status=Topic.Status.OPEN
        ).select_related("author", "category", "last_reply_by")[offset:offset + page_size]

    @classmethod
    def get_recent_topics(cls, page: int = 1, page_size: int = 20) -> QuerySet:
        """Get recent topics."""
        offset = (page - 1) * page_size
        return Topic.objects.filter(
            status=Topic.Status.OPEN
        ).select_related("author", "category", "last_reply_by")[offset:offset + page_size]

    @classmethod
    def get_topic_with_replies(cls, topic_slug: str, page: int = 1, page_size: int = 20):
        """Get topic with paginated replies."""
        topic = cls.get_topic_by_slug(topic_slug)
        if not topic:
            return None, None

        offset = (page - 1) * page_size
        replies = Reply.objects.filter(
            topic=topic,
            is_hidden=False
        ).select_related("author")[offset:offset + page_size]

        return topic, replies

    @classmethod
    @transaction.atomic
    def mark_reply_as_solution(cls, reply: Reply) -> Reply:
        """Mark a reply as solution."""
        Reply.objects.filter(topic=reply.topic, is_solution=True).update(is_solution=False)
        reply.mark_as_solution()
        return reply

    @classmethod
    @transaction.atomic
    def hide_reply(cls, reply: Reply, reason: str = "") -> Reply:
        """Hide a reply (moderator action)."""
        reply.hide(reason)
        return reply

    @classmethod
    @transaction.atomic
    def pin_topic(cls, topic: Topic) -> Topic:
        """Pin a topic."""
        topic.pin()
        return topic

    @classmethod
    @transaction.atomic
    def unpin_topic(cls, topic: Topic) -> Topic:
        """Unpin a topic."""
        topic.unpin()
        return topic

    @classmethod
    @transaction.atomic
    def lock_topic(cls, topic: Topic) -> Topic:
        """Lock a topic."""
        topic.close()
        return topic

    @classmethod
    @transaction.atomic
    def unlock_topic(cls, topic: Topic) -> Topic:
        """Unlock a topic."""
        topic.open()
        return topic

    @classmethod
    def search_topics(cls, query: str, page: int = 1, page_size: int = 20) -> QuerySet:
        """Search topics by title or content."""
        offset = (page - 1) * page_size
        return Topic.objects.filter(
            models.Q(title__icontains=query) | models.Q(content__icontains=query)
        ).select_related("author", "category", "last_reply_by")[offset:offset + page_size]

    @classmethod
    def get_popular_topics(cls, limit: int = 5) -> QuerySet:
        """Get topics with most replies and views."""
        return Topic.objects.filter(status=Topic.Status.OPEN).order_by(
            "-reply_count", "-view_count"
        ).select_related("author", "category")[:limit]


class ReactionService:
    """Service for managing reactions."""

    REACTION_TYPES = ["like", "dislike", "heart", "laugh", "wow"]

    @classmethod
    @transaction.atomic
    def add_topic_reaction(cls, topic: Topic, user, reaction: str) -> TopicReaction:
        """Add reaction to topic."""
        if reaction not in cls.REACTION_TYPES:
            raise ValueError(f"Invalid reaction type. Choose from: {cls.REACTION_TYPES}")

        existing = TopicReaction.objects.filter(
            user=user, topic=topic, reaction=reaction
        ).first()

        if existing:
            existing.delete()
            return None

        other_reactions = TopicReaction.objects.filter(user=user, topic=topic)
        other_reactions.delete()

        return TopicReaction.objects.create(
            user=user,
            topic=topic,
            reaction=reaction
        )

    @classmethod
    @transaction.atomic
    def add_reply_reaction(cls, reply: Reply, user, reaction: str) -> ReplyReaction:
        """Add reaction to reply."""
        if reaction not in cls.REACTION_TYPES:
            raise ValueError(f"Invalid reaction type. Choose from: {cls.REACTION_TYPES}")

        existing = ReplyReaction.objects.filter(
            user=user, reply=reply, reaction=reaction
        ).first()

        if existing:
            existing.delete()
            return None

        other_reactions = ReplyReaction.objects.filter(user=user, reply=reply)
        other_reactions.delete()

        return ReplyReaction.objects.create(
            user=user,
            reply=reply,
            reaction=reaction
        )

    @classmethod
    def get_topic_reactions(cls, topic: Topic) -> dict:
        """Get reaction summary for a topic."""
        reactions = TopicReaction.objects.filter(topic=topic)
        summary = {r: 0 for r in cls.REACTION_TYPES}
        for r in reactions:
            summary[r.reaction] = summary.get(r.reaction, 0) + 1
        return summary

    @classmethod
    def get_reply_reactions(cls, reply: Reply) -> dict:
        """Get reaction summary for a reply."""
        reactions = ReplyReaction.objects.filter(reply=reply)
        summary = {r: 0 for r in cls.REACTION_TYPES}
        for r in reactions:
            summary[r.reaction] = summary.get(r.reaction, 0) + 1
        return summary
