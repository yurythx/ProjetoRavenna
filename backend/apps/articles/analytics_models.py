import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from apps.core.models import TenantManager


class ArticleView(models.Model):
    """
    Tracks individual article views with privacy-conscious approach.
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    tenant = models.ForeignKey(
        'entities.Entity',
        on_delete=models.CASCADE,
        related_name='article_views',
        null=True,
        blank=True
    )
    
    # Relationships
    article = models.ForeignKey(
        'Article',
        on_delete=models.CASCADE,
        related_name='views'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='article_views'
    )
    
    # Session tracking
    session_id = models.CharField(
        max_length=255,
        db_index=True,
        help_text="Session key for deduplication"
    )
    
    # Privacy-conscious metadata
    ip_hash = models.CharField(
        max_length=64,
        help_text="SHA256 hash of IP address for deduplication only"
    )
    user_agent = models.CharField(
        max_length=500,
        blank=True,
        help_text="Browser user agent string"
    )
    referer = models.URLField(
        max_length=500,
        blank=True,
        help_text="HTTP referer (where visitor came from)"
    )
    
    # Reading behavior metrics
    reading_progress = models.IntegerField(
        default=0,
        help_text="Reading progress percentage (0-100)"
    )
    time_spent = models.IntegerField(
        default=0,
        help_text="Time spent reading in seconds"
    )
    
    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True
    )
    updated_at = models.DateTimeField(auto_now=True)
    
    objects = TenantManager()

    class Meta:
        db_table = 'article_views'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['article', 'created_at'], name='av_article_created_idx'),
            models.Index(fields=['session_id', 'article'], name='av_session_article_idx'),
            models.Index(fields=['user', 'created_at'], name='av_user_created_idx'),
            models.Index(fields=['tenant', 'created_at'], name='av_tenant_created_idx'),
        ]
        verbose_name = 'Article View'
        verbose_name_plural = 'Article Views'
    
    def __str__(self):
        viewer = self.user.username if self.user else f"Anonymous ({self.session_id[:8]}...)"
        return f"{viewer} viewed '{self.article.title}' at {self.created_at.strftime('%Y-%m-%d %H:%M')}"
    
    @property
    def is_anonymous(self):
        return self.user is None
    
    @property
    def completed_reading(self):
        return self.reading_progress >= 80


class ReadingSession(models.Model):
    """
    Tracks detailed reading sessions for engaged users.
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    tenant = models.ForeignKey(
        'entities.Entity',
        on_delete=models.CASCADE,
        related_name='reading_sessions',
        null=True,
        blank=True
    )
    
    # Relationship to ArticleView
    article_view = models.OneToOneField(
        ArticleView,
        on_delete=models.CASCADE,
        related_name='session'
    )
    
    # Time tracking
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the reading session ended"
    )
    duration_seconds = models.IntegerField(
        default=0,
        help_text="Total duration in seconds"
    )
    
    # Engagement metrics
    scrolled_to_bottom = models.BooleanField(
        default=False,
        help_text="Did the user scroll to the bottom?"
    )
    interactions = models.IntegerField(
        default=0,
        help_text="Number of interactions (clicks, likes, comments)"
    )
    
    objects = TenantManager()

    class Meta:
        db_table = 'reading_sessions'
        ordering = ['-started_at']
        verbose_name = 'Reading Session'
        verbose_name_plural = 'Reading Sessions'
    
    def __str__(self):
        return f"Session for {self.article_view} - {self.duration_seconds}s"
    
    def end_session(self):
        if not self.ended_at:
            self.ended_at = timezone.now()
            self.duration_seconds = int((self.ended_at - self.started_at).total_seconds())
            self.save()
    
    @property
    def is_active(self):
        return self.ended_at is None
    
    @property
    def is_engaged(self):
        return (
            self.duration_seconds > 30 or
            self.scrolled_to_bottom or
            self.interactions > 0
        )
