import uuid
from django.db import models
from django.utils.text import slugify

class BaseUUIDModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

class SlugMixin(models.Model):
    slug = models.SlugField(max_length=255, unique=True, blank=True)

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if not self.slug:
            source = getattr(self, 'name', None) or getattr(self, 'title', None)
            if source:
                slug_candidate = slugify(source)
                unique_slug = slug_candidate
                counter = 1
                
                # Check for collisions excluding current instance
                # We need to access the class of the instance dynamically to check the DB
                ModelClass = self.__class__
                
                while ModelClass.objects.filter(slug=unique_slug).exclude(pk=self.pk).exists():
                    unique_slug = f"{slug_candidate}-{counter}"
                    counter += 1
                
                self.slug = unique_slug
        super().save(*args, **kwargs)

class AppModule(BaseUUIDModel, SlugMixin):
    name = models.CharField(max_length=100, help_text="Module name (e.g. Articles)")
    # slug will be generated from name
    display_name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    is_system_module = models.BooleanField(default=False)
    config_json = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return self.display_name


class Notification(BaseUUIDModel):
    """
    Model for user notifications
    """
    TYPES = (
        ('COMMENT_REPLY', 'Resposta em Comentário'),
        ('ARTICLE_COMMENT', 'Comentário em Artigo'),
        ('ARTICLE_PUBLISHED', 'Artigo Publicado'),
        ('SYSTEM', 'Sistema'),
    )
    
    recipient = models.ForeignKey('accounts.CustomUser', on_delete=models.CASCADE, related_name='notifications')
    sender = models.ForeignKey('accounts.CustomUser', on_delete=models.CASCADE, null=True, blank=True, related_name='sent_notifications')
    notification_type = models.CharField(max_length=20, choices=TYPES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    link = models.CharField(max_length=500, blank=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', '-created_at']),
            models.Index(fields=['recipient', 'is_read']),
        ]
    
    def __str__(self):
        return f"{self.notification_type} for {self.recipient.email}"
    
    def mark_as_read(self):
        if not self.is_read:
            from django.utils import timezone
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])
