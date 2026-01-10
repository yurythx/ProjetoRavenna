from django.db import models
from django_resized import ResizedImageField
from django.contrib.postgres.search import SearchVectorField
from django.contrib.postgres.indexes import GinIndex
from apps.core.models import BaseUUIDModel, SlugMixin
from .like_models import ArticleLike, ArticleFavorite  # Import for migrations
from .analytics_models import ArticleView, ReadingSession  # Import for migrations

class Category(BaseUUIDModel, SlugMixin):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    class Meta:
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name

class Tag(BaseUUIDModel, SlugMixin):
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=7, default='#3B82F6', help_text='Hex color code (e.g., #3B82F6)')
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return self.name

class Article(BaseUUIDModel, SlugMixin):
    title = models.CharField(max_length=255)
    content = models.TextField()
    category = models.ForeignKey(Category, related_name='articles', on_delete=models.CASCADE)
    tags = models.ManyToManyField(Tag, related_name='articles', blank=True)
    author = models.ForeignKey('accounts.CustomUser', related_name='articles', on_delete=models.SET_NULL, null=True)
    banner = ResizedImageField(
        size=[1200, 630],
        quality=85,
        upload_to='articles/banners/',
        force_format='WEBP',
        blank=True, 
        null=True
    )
    is_published = models.BooleanField(default=False)
    search_vector = SearchVectorField(null=True, blank=True)
    
    class Meta:
        indexes = [
            GinIndex(fields=['search_vector'], name='search_vector_idx'),
        ]

    def __str__(self):
        return self.title
    
    def update_search_vector(self):
        """Update the search vector with weighted content for full-text search"""
        from django.db import connection
        
        # SearchVector is Postgres-specific. Skip for SQLite (tests/dev).
        if connection.vendor == 'sqlite':
            return

        from django.contrib.postgres.search import SearchVector
        
        # Weight A (highest) for title, Weight B for content
        self.search_vector = (
            SearchVector('title', weight='A', config='portuguese') +
            SearchVector('content', weight='B', config='portuguese')
        )
        # Avoid calling save() again to prevent recursion if called from save()
        super().save(update_fields=['search_vector'])
    
    def save(self, *args, **kwargs):
        # Standard save
        super().save(*args, **kwargs)
        
        # Update search vector automatically
        # We need to do this after save because SearchVector might need database functions
        # However, for simple vector updates, we can do it before or after.
        # But since we are updating a specific field, let's do it here.
        self.update_search_vector()

    # Analytics Methods
    
    def get_view_count(self):
        """Get total view count (cached for performance)."""
        from django.core.cache import cache
        cache_key = f'article:{self.id}:views'
        count = cache.get(cache_key)
        if count is None:
            count = self.views.count()
            cache.set(cache_key, count, timeout=300)  # 5 min cache
        return count
    
    def get_unique_views(self):
        """Get unique visitor count (based on session_id)."""
        return self.views.values('session_id').distinct().count()
    
    def calculate_reading_time(self):
        """
        Calculate estimated reading time in minutes.
        Based on:
        - 200 words per minute (industry standard)
        - 12 seconds per image (viewing time)
        - Minimum 1 minute
        """
        from django.utils.html import strip_tags
        
        if not self.content:
            return 1
        
        # Count words (strip HTML tags first)
        text = strip_tags(self.content)
        word_count = len(text.split())
        
        # Count images (simple count of <img tags)
        image_count = self.content.count('<img')
        
        # Calculate time
        reading_seconds = (word_count / 200) * 60  # 200 words/min
        image_seconds = image_count * 12  # 12 seconds per image
        total_seconds = reading_seconds + image_seconds
        
        # Round up to nearest minute, minimum 1
        return max(1, round(total_seconds / 60))
    
    def get_engagement_rate(self):
        """
        Calculate engagement rate: (likes + comments) / views * 100
        Returns 0 if no views to avoid division by zero.
        """
        views = self.get_view_count()
        if views == 0:
            return 0.0
        
        # Count engagements (likes + comments)
        like_count = self.likes.count()
        comment_count = self.comments.filter(is_approved=True).count()
        engagements = like_count + comment_count
        
        return round((engagements / views) * 100, 2)

class Comment(BaseUUIDModel):
    article = models.ForeignKey(Article, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey('accounts.CustomUser', on_delete=models.CASCADE, related_name='comments', null=True, blank=True)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    content = models.TextField(max_length=1000)
    is_approved = models.BooleanField(default=True)
    guest_name = models.CharField(max_length=120, blank=True, null=True)
    guest_email = models.EmailField(blank=True, null=True)
    guest_phone = models.CharField(max_length=32, blank=True, null=True, help_text='Contato (DDD + número)')
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        who = (self.author and self.author.email) or self.guest_email or self.guest_name or 'anonymous'
        return f"Comment by {who} on {self.article.title}"
    
    @property
    def is_reply(self):
        return self.parent is not None
