from django.db import models
from django.db.models import QuerySet, Count, Exists, OuterRef
from .models import Article
from .like_models import ArticleLike, ArticleFavorite
from apps.core.models import AppModule

def article_list_published():
    """
    Returns published articles with optimized queries using select_related and prefetch_related.
    """
    return Article.objects.filter(is_published=True)\
        .select_related('author', 'category')\
        .prefetch_related('tags')

def article_detail(slug: str, user=None):
    queryset = Article.objects.filter(slug=slug)\
        .select_related('author', 'category')\
        .prefetch_related('tags')\
        .annotate(
            likes_count=Count('likes', distinct=True),
            comments_count=Count('comments', filter=models.Q(comments__is_approved=True), distinct=True)
        )

    # Add user-specific annotations for authenticated users (including admins)
    if user and user.is_authenticated:
        queryset = queryset.annotate(
            is_liked_by_user=Exists(
                ArticleLike.objects.filter(
                    article_id=OuterRef('pk'),
                    user_id=user.id
                )
            ),
            is_favorited_by_user=Exists(
                ArticleFavorite.objects.filter(
                    article_id=OuterRef('pk'),
                    user_id=user.id
                )
            )
        )

    return queryset.first()

def article_list(user) -> QuerySet:
    """
    Returns articles based on visibility permissions:
    - Admin: All articles
    - Authenticated: Published + Own drafts
    - Anonymous: Published only
    """
    queryset = Article.objects.select_related('author', 'category').prefetch_related('tags')
    
    # Annotate counts to avoid N+1 queries in serializer
    queryset = queryset.annotate(
        likes_count=Count('likes', distinct=True),
        comments_count=Count('comments', filter=models.Q(comments__is_approved=True), distinct=True)
    )

    if not user.is_superuser:
        if user.is_authenticated:
            # Logged user sees what is published OR what they created
            queryset = queryset.filter(models.Q(is_published=True) | models.Q(author=user))
            
            # Annotate user specific interactions
            queryset = queryset.annotate(
                is_liked_by_user=Exists(
                    ArticleLike.objects.filter(
                        article_id=OuterRef('pk'),
                        user_id=user.id
                    )
                ),
                is_favorited_by_user=Exists(
                    ArticleFavorite.objects.filter(
                        article_id=OuterRef('pk'),
                        user_id=user.id
                    )
                )
            )
        else:
            # Anonymous visitor sees only published
            queryset = queryset.filter(is_published=True)
            
    return queryset.order_by('-created_at')
