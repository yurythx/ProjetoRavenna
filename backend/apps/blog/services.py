"""
Service layer for blog operations.
"""
import uuid
from typing import Optional, List

from django.db import models
from django.db import transaction
from django.db.models import QuerySet
from django.utils.dateparse import parse_datetime

from apps.blog.models import Category, Comment, Post, PostRevision, Tag


class CategoryService:
    """Service for category operations."""

    @classmethod
    def create_category(
        cls,
        name: str,
        slug: str,
        description: str = "",
        display_order: int = 0,
    ) -> Category:
        """Create a new category."""
        return Category.objects.create(
            name=name,
            slug=slug,
            description=description,
            display_order=display_order,
        )

    @classmethod
    def get_all_active(cls) -> QuerySet:
        """Get all active categories."""
        return Category.objects.filter(is_active=True).order_by("display_order", "name")

    @classmethod
    def get_by_slug(cls, slug: str) -> Optional[Category]:
        """Get category by slug."""
        return Category.objects.filter(slug=slug).first()


class TagService:
    """Service for tag operations."""

    @classmethod
    def create_tag(cls, name: str, slug: str = None) -> Tag:
        """Create or get a tag."""
        if slug is None:
            slug = name.lower().replace(" ", "-")

        tag, created = Tag.objects.get_or_create(
            slug=slug,
            defaults={"name": name}
        )
        return tag

    @classmethod
    def get_all(cls) -> QuerySet:
        """Get all tags."""
        return Tag.objects.all().order_by("name")

    @classmethod
    def get_by_slug(cls, slug: str) -> Optional[Tag]:
        """Get tag by slug."""
        return Tag.objects.filter(slug=slug).first()


class PostService:
    """Service for blog post operations."""

    @classmethod
    def _snapshot_post(cls, post: Post) -> dict:
        post.refresh_from_db(fields=None)
        return {
            "title": post.title,
            "slug": post.slug,
            "excerpt": post.excerpt,
            "content": post.content,
            "category_id": str(post.category_id) if post.category_id else None,
            "tag_ids": [str(tid) for tid in post.tags.values_list("id", flat=True)],
            "status": post.status,
            "rejection_reason": post.rejection_reason,
            "is_public": post.is_public,
            "is_featured": post.is_featured,
            "published_at": post.published_at.isoformat() if post.published_at else None,
            "image": post.image.name if getattr(post.image, "name", None) else None,
            "meta_title": post.meta_title,
            "meta_description": post.meta_description,
            "meta_keywords": post.meta_keywords,
        }

    @classmethod
    def _create_revision(cls, *, post: Post, user, comment: str) -> None:
        PostRevision.objects.create(
            post=post,
            user=user if getattr(user, "is_authenticated", False) else None,
            comment=comment or "",
            data=cls._snapshot_post(post),
        )

    @classmethod
    @transaction.atomic
    def create_post(
        cls,
        title: str,
        slug: str,
        content: str,
        author,
        excerpt: str = "",
        category_id: Optional[uuid.UUID] = None,
        tag_ids: Optional[List[uuid.UUID]] = None,
        tag_names: Optional[List[str]] = None,
        status: str = Post.Status.DRAFT,
        rejection_reason: str = "",
        is_public: bool = True,
        is_featured: bool = False,
        image=None,
        meta_title: str = "",
        meta_description: str = "",
        meta_keywords: str = "",
    ) -> Post:
        """Create a new blog post."""
        from apps.common.html_sanitizer import sanitize_html, sanitize_plain_text

        safe_content = sanitize_html(content)
        safe_excerpt = sanitize_plain_text(excerpt)
        post = Post.objects.create(
            title=title,
            slug=slug,
            content=safe_content,
            author=author,
            excerpt=safe_excerpt,
            category_id=category_id,
            status=status,
            rejection_reason=rejection_reason,
            is_public=is_public,
            is_featured=is_featured,
            image=image,
            meta_title=meta_title or title,
            meta_description=meta_description or safe_excerpt[:160] if safe_excerpt else "",
            meta_keywords=meta_keywords,
        )

        if tag_names:
            tags = [TagService.create_tag(name) for name in tag_names]
            post.tags.set(tags)
        if tag_ids:
            post.tags.add(*Tag.objects.filter(id__in=tag_ids))

        if status == Post.Status.PUBLISHED:
            post.publish()

        cls._create_revision(post=post, user=author, comment="Created")
        return post

    @classmethod
    @transaction.atomic
    def update_post(
        cls,
        post: Post,
        data: dict,
        updated_by,
    ) -> Post:
        """Update a blog post."""
        from apps.common.html_sanitizer import sanitize_html, sanitize_plain_text

        cls._create_revision(post=post, user=updated_by, comment="Updated")

        previous_status = post.status
        requested_status = data.get("status") if isinstance(data, dict) else None

        allowed_fields = [
            "title", "slug", "content", "excerpt", "category_id",
            "status", "rejection_reason", "is_featured", "image", "meta_title", "meta_description", "meta_keywords", "is_public"
        ]

        for field in allowed_fields:
            if field in data:
                if field == "status":
                    continue
                if field == "content":
                    setattr(post, field, sanitize_html(data[field] or ""))
                elif field == "excerpt":
                    setattr(post, field, sanitize_plain_text(data[field] or ""))
                else:
                    setattr(post, field, data[field])

        if "tag_names" in data and data["tag_names"] is not None:
            tags = [TagService.create_tag(name) for name in data["tag_names"]]
            post.tags.set(tags)
        if "tag_ids" in data and data["tag_ids"] is not None:
            post.tags.set(Tag.objects.filter(id__in=data["tag_ids"]))

        if requested_status is not None:
            post.status = requested_status
            if previous_status == Post.Status.PUBLISHED and requested_status != Post.Status.PUBLISHED:
                post.published_at = None
        post.save()

        if requested_status == Post.Status.PUBLISHED and previous_status != Post.Status.PUBLISHED:
            post.publish()
        elif requested_status == Post.Status.DRAFT and previous_status == Post.Status.PUBLISHED:
            post.unpublish()
        elif requested_status == Post.Status.ARCHIVED and previous_status != Post.Status.ARCHIVED:
            post.archive()

        return post

    @classmethod
    def publish_post(cls, post: Post) -> Post:
        """Publish a post."""
        if post.status == Post.Status.ARCHIVED:
            raise ValueError("Cannot publish an archived post.")

        post.publish()
        return post

    @classmethod
    def archive_post(cls, post: Post) -> Post:
        """Archive a post."""
        post.archive()
        return post

    @classmethod
    @transaction.atomic
    def revert_to_revision(cls, *, user, post: Post, revision_id: int) -> Post:
        from apps.common.html_sanitizer import sanitize_html, sanitize_plain_text

        try:
            rev = PostRevision.objects.select_related("post").get(id=revision_id)
        except PostRevision.DoesNotExist as e:
            raise ValueError("Revision not found") from e

        if rev.post_id != post.id:
            raise ValueError("Revision does not belong to this post")

        cls._create_revision(post=post, user=user, comment=f"Reverted (pre) -> {revision_id}")

        data = rev.data or {}
        post.title = data.get("title", post.title)
        post.slug = data.get("slug", post.slug)
        post.excerpt = sanitize_plain_text(data.get("excerpt", post.excerpt) or "")
        post.content = sanitize_html(data.get("content", post.content) or "")
        post.status = data.get("status", post.status)
        post.rejection_reason = data.get("rejection_reason", post.rejection_reason or "")
        post.is_public = data.get("is_public", post.is_public)
        post.is_featured = bool(data.get("is_featured", post.is_featured))
        post.meta_title = data.get("meta_title", post.meta_title or "")
        post.meta_description = data.get("meta_description", post.meta_description or "")
        post.meta_keywords = data.get("meta_keywords", post.meta_keywords or "")

        category_id = data.get("category_id")
        if category_id:
            post.category_id = category_id
        else:
            post.category = None

        published_at = data.get("published_at")
        post.published_at = parse_datetime(published_at) if published_at else None

        post.save()

        tag_ids = data.get("tag_ids") or []
        if isinstance(tag_ids, list):
            post.tags.set(Tag.objects.filter(id__in=tag_ids))

        cls._create_revision(post=post, user=user, comment=f"Reverted -> {revision_id}")
        return post

    @classmethod
    def delete_post(cls, post: Post) -> None:
        """Delete a post."""
        post.delete()

    @classmethod
    def get_published_posts(cls, page: int = 1, page_size: int = 20) -> QuerySet:
        """Get all published posts."""
        offset = (page - 1) * page_size
        return Post.objects.filter(
            status=Post.Status.PUBLISHED,
        ).select_related("author", "category").prefetch_related("tags")[offset:offset + page_size]

    @classmethod
    def get_post_by_slug(cls, slug: str) -> Optional[Post]:
        """Get published post by slug."""
        return Post.objects.filter(
            slug=slug,
            status=Post.Status.PUBLISHED,
        ).select_related("author", "category").prefetch_related("tags").first()

    @classmethod
    def get_posts_by_category(cls, category_slug: str, page: int = 1, page_size: int = 20) -> QuerySet:
        """Get published posts by category."""
        offset = (page - 1) * page_size
        return Post.objects.filter(
            category__slug=category_slug,
            status=Post.Status.PUBLISHED,
        ).select_related("author", "category")[offset:offset + page_size]

    @classmethod
    def get_posts_by_tag(cls, tag_slug: str, page: int = 1, page_size: int = 20) -> QuerySet:
        """Get published posts by tag."""
        offset = (page - 1) * page_size
        return Post.objects.filter(
            tags__slug=tag_slug,
            status=Post.Status.PUBLISHED,
        ).select_related("author", "category")[offset:offset + page_size]

    @classmethod
    def get_featured_posts(cls, limit: int = 5) -> QuerySet:
        """Get featured published posts."""
        return Post.objects.filter(
            status=Post.Status.PUBLISHED,
            is_featured=True
        ).select_related("author", "category").prefetch_related("tags")[:limit]

    @classmethod
    def get_drafts_by_author(cls, author, page: int = 1, page_size: int = 20) -> QuerySet:
        """Get draft posts by author."""
        offset = (page - 1) * page_size
        return Post.objects.filter(
            author=author,
            status=Post.Status.DRAFT
        ).select_related("category")[offset:offset + page_size]

    @classmethod
    def search_posts(cls, query: str, page: int = 1, page_size: int = 20) -> QuerySet:
        """Search published posts."""
        offset = (page - 1) * page_size
        return Post.objects.filter(
            status=Post.Status.PUBLISHED,
        ).filter(
            models.Q(title__icontains=query) |
            models.Q(content__icontains=query) |
            models.Q(excerpt__icontains=query)
        ).select_related("author", "category")[offset:offset + page_size]


class CommentService:
    @classmethod
    @transaction.atomic
    def create_comment(
        cls,
        *,
        author,
        content: str,
        post: Optional[Post] = None,
        post_slug: Optional[str] = None,
        parent: Optional[Comment] = None,
        name: str = "",
        email: str = "",
        website: str = "",
    ) -> Comment:
        from apps.common.html_sanitizer import sanitize_plain_text

        if post is None:
            if not post_slug:
                raise ValueError("post or post_slug is required.")
            post = Post.objects.filter(slug=post_slug).first()
            if not post:
                raise ValueError("Post not found.")

        is_authenticated_user = bool(author and getattr(author, "is_authenticated", False))
        is_editor = bool(
            author
            and is_authenticated_user
            and (
                getattr(author, "is_blog_editor", False)
                or getattr(author, "is_staff", False)
                or getattr(author, "is_superuser", False)
            )
        )
        if is_authenticated_user and not is_editor:
            if not getattr(author, "is_active_and_not_banned", False) or not getattr(author, "is_verified", False):
                raise PermissionError("User not allowed.")
            if not (getattr(author, "is_player", False) or getattr(author, "is_staff", False) or getattr(author, "is_superuser", False)):
                raise PermissionError("User not allowed.")
        if not is_editor:
            if post.status != Post.Status.PUBLISHED or not bool(post.is_public):
                raise ValueError("Post not found.")

        if parent and parent.post_id != post.id:
            raise ValueError("Parent comment must belong to the same post.")

        is_approved = False
        if is_editor:
            is_approved = True

        safe_content = sanitize_plain_text(content or "")
        safe_name = sanitize_plain_text(name or "")
        safe_email = (email or "").strip()
        safe_website = (website or "").strip()

        if is_authenticated_user:
            safe_name = ""
            safe_email = ""

        return Comment.objects.create(
            post=post,
            parent=parent,
            author=author,
            content=safe_content,
            name=safe_name,
            email=safe_email,
            website=safe_website,
            is_public=True,
            is_approved=is_approved,
        )
