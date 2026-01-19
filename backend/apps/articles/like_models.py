from django.db import models
from apps.core.models import BaseUUIDModel, TenantManager


class ArticleLike(BaseUUIDModel):
    """
    Tracks article likes by users.
    One user can like an article only once.
    """
    tenant = models.ForeignKey('entities.Entity', on_delete=models.CASCADE, related_name='article_likes', null=True, blank=True)
    article = models.ForeignKey(
        'Article', 
        on_delete=models.CASCADE, 
        related_name='likes'
    )
    user = models.ForeignKey(
        'accounts.CustomUser', 
        on_delete=models.CASCADE, 
        related_name='article_likes'
    )
    
    objects = TenantManager()

    class Meta:
        unique_together = [['article', 'user']]
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['article']),
            models.Index(fields=['user']),
        ]
        verbose_name = 'Article Like'
        verbose_name_plural = 'Article Likes'
    
    def __str__(self):
        return f"{self.user.email} likes {self.article.title}"


class ArticleFavorite(BaseUUIDModel):
    """
    Tracks favorited/bookmarked articles by users.
    One user can favorite an article only once.
    """
    tenant = models.ForeignKey('entities.Entity', on_delete=models.CASCADE, related_name='article_favorites', null=True, blank=True)
    article = models.ForeignKey(
        'Article', 
        on_delete=models.CASCADE, 
        related_name='favorites'
    )
    user = models.ForeignKey(
        'accounts.CustomUser', 
        on_delete=models.CASCADE, 
        related_name='article_favorites'
    )
    
    objects = TenantManager()

    class Meta:
        unique_together = [['article', 'user']]
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['article']),
            models.Index(fields=['user']),
        ]
        verbose_name = 'Article Favorite'
        verbose_name_plural = 'Article Favorites'
    
    def __str__(self):
        return f"{self.user.email} favorited {self.article.title}"
