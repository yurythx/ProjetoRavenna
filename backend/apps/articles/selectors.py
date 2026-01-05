from django.db import models
from django.db.models import QuerySet
from .models import Article
from apps.core.models import AppModule

def article_list_published():
    """
    Returns published articles with optimized queries using select_related and prefetch_related.
    """
    return Article.objects.filter(is_published=True)\
        .select_related('author', 'category')\
        .prefetch_related('tags')

def article_detail(slug: str):
    return Article.objects.filter(slug=slug)\
        .select_related('author', 'category')\
        .prefetch_related('tags')\
        .first()

def article_list(user) -> QuerySet:
    """
    Returns articles based on visibility permissions:
    - Admin: All articles
    - Authenticated: Published + Own drafts
    - Anonymous: Published only
    """
    queryset = Article.objects.select_related('author', 'category').prefetch_related('tags')

    if not user.is_superuser:
        if user.is_authenticated:
            # Logged user sees what is published OR what they created
            queryset = queryset.filter(models.Q(is_published=True) | models.Q(author=user))
        else:
            # Anonymous visitor sees only published
            queryset = queryset.filter(is_published=True)
            
    return queryset.order_by('-created_at')
