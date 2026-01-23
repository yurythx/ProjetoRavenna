from django.db import models
from django_resized import ResizedImageField
from django.contrib.postgres.search import SearchVectorField
from django.contrib.postgres.indexes import GinIndex
from apps.core.models import BaseUUIDModel, SlugMixin, TenantManager
from .like_models import ArticleLike, ArticleFavorite  # Import for migrations
from .analytics_models import ArticleView, ReadingSession  # Import for migrations

def tenant_upload_path(instance, filename):
    """
    Generates a partition path for uploads based on the tenant.
    Format: tenant_<uuid>/<app_label>/<model_name>/<filename>
    """
    tenant_id = getattr(instance, 'tenant_id', 'shared')
    app_label = instance._meta.app_label
    model_name = instance._meta.model_name
    return f'tenant_{tenant_id}/{app_label}/{model_name}/{filename}'

class Category(BaseUUIDModel, SlugMixin):
    tenant = models.ForeignKey('entities.Entity', on_delete=models.CASCADE, related_name='categories', null=True, blank=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    objects = TenantManager()

    class Meta:
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name

class Tag(BaseUUIDModel, SlugMixin):
    tenant = models.ForeignKey('entities.Entity', on_delete=models.CASCADE, related_name='tags', null=True, blank=True)
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=7, default='#3B82F6', help_text='Hex color code (e.g., #3B82F6)')
    
    objects = TenantManager()

    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return self.name

class Article(BaseUUIDModel, SlugMixin):
    STATUS_CHOICES = (
        ('DRAFT', 'Rascunho'),
        ('PUBLISHED', 'Publicado'),
        ('ARCHIVED', 'Arquivado'),
    )

    tenant = models.ForeignKey('entities.Entity', on_delete=models.CASCADE, related_name='articles', null=True, blank=True)
    title = models.CharField(max_length=255)
    excerpt = models.TextField(max_length=500, blank=True, help_text="Short description shown in lists")
    content = models.TextField(help_text="Legacy HTML content", blank=True)
    content_json = models.JSONField(default=dict, blank=True, help_text="Structured block content (TipTap)")
    category = models.ForeignKey(Category, related_name='articles', on_delete=models.CASCADE)
    tags = models.ManyToManyField(Tag, related_name='articles', blank=True)
    author = models.ForeignKey('accounts.CustomUser', related_name='articles', on_delete=models.SET_NULL, null=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='DRAFT')
    banner = ResizedImageField(
        size=[1200, 630],
        quality=85,
        upload_to=tenant_upload_path,
        force_format='WEBP',
        blank=True, 
        null=True
    )
    is_published = models.BooleanField(default=False)
    search_vector = SearchVectorField(null=True, blank=True)
    
    objects = TenantManager()
    
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

        if self.content_json:
            import json
            # Extract text from TipTap JSON for search
            def extract_text(node):
                text = ""
                if node.get('type') == 'text':
                    text += node.get('text', '')
                for child in node.get('content', []):
                    text += " " + extract_text(child)
                return text
            
            content_text = extract_text(self.content_json)
        else:
            from django.utils.html import strip_tags
            content_text = strip_tags(self.content or "")

        # Weight A (highest) for title, Weight B for content
        self.search_vector = (
            SearchVector('title', weight='A', config='portuguese') +
            SearchVector(models.Value(content_text), weight='B', config='portuguese')
        )
        # Avoid calling save() again to prevent recursion if called from save()
        super().save(update_fields=['search_vector'])
    
    def save(self, *args, **kwargs):
        # Standard save
        super().save(*args, **kwargs)
        
        # Update search vector automatically
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
        Supports both legacy HTML and TipTap JSON.
        """
        from django.utils.html import strip_tags
        
        if self.content_json:
            def extract_text(node):
                text = ""
                if node.get('type') == 'text':
                    text += node.get('text', '')
                for child in node.get('content', []):
                    text += " " + extract_text(child)
                return text
            text = extract_text(self.content_json)
            # Rough estimation for images in JSON
            import json
            content_str = json.dumps(self.content_json)
            image_count = content_str.count('"type": "image"')
            video_count = content_str.count('"type": "youtube"')
        else:
            if not self.content:
                return 1
            text = strip_tags(self.content)
            image_count = self.content.count('<img')
            video_count = 0
            
        word_count = len(text.split())
        
        reading_seconds = (word_count / 200) * 60
        media_seconds = (image_count * 12) + (video_count * 20)
        total_seconds = reading_seconds + media_seconds
        
        return max(1, round(total_seconds / 60))
    
    def get_engagement_rate(self):
        """
        Calculate engagement rate: (likes + comments) / views * 100
        """
        views = self.get_view_count()
        if views == 0:
            return 0.0
        
        like_count = self.likes.count()
        comment_count = self.comments.filter(is_approved=True).count()
        engagements = like_count + comment_count
        
        return round((engagements / views) * 100, 2)

class Comment(BaseUUIDModel):
    tenant = models.ForeignKey('entities.Entity', on_delete=models.CASCADE, related_name='comments', null=True, blank=True)
    article = models.ForeignKey(Article, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey('accounts.CustomUser', on_delete=models.CASCADE, related_name='comments', null=True, blank=True)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    content = models.TextField(max_length=1000)
    is_approved = models.BooleanField(default=True)
    guest_name = models.CharField(max_length=120, blank=True, null=True)
    guest_email = models.EmailField(blank=True, null=True)
    guest_phone = models.CharField(max_length=32, blank=True, null=True, help_text='Contato (DDD + número)')
    
    objects = TenantManager()

    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        who = (self.author and self.author.email) or self.guest_email or self.guest_name or 'anonymous'
        return f"Comment by {who} on {self.article.title}"
    
    @property
    def is_reply(self):
        return self.parent is not None
    
    def __str__(self):
        who = (self.author and self.author.email) or self.guest_email or self.guest_name or 'anonymous'
        return f"Comment by {who} on {self.article.title}"
    
    @property
    def is_reply(self):
        return self.parent is not None
