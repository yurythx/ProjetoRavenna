import uuid
from django.db import models
from django.utils.text import slugify
from apps.core.tenant_context import get_current_tenant_id

class TenantQuerySet(models.QuerySet):
    def for_tenant(self):
        tenant_id = get_current_tenant_id()
        if tenant_id:
            return self.filter(tenant_id=tenant_id)
        return self

class TenantManager(models.Manager):
    def get_queryset(self):
        return TenantQuerySet(self.model, using=self._db).for_tenant()

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
                ModelClass = self.__class__
                
                while ModelClass.objects.filter(slug=unique_slug).exclude(pk=self.pk).exists():
                    unique_slug = f"{slug_candidate}-{counter}"
                    counter += 1
                
                self.slug = unique_slug
        super().save(*args, **kwargs)

class AppModule(BaseUUIDModel, SlugMixin):
    name = models.CharField(max_length=100, help_text="Module name (e.g. Articles)")
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

    tenant = models.ForeignKey('entities.Entity', on_delete=models.CASCADE, related_name='notifications', null=True, blank=True)
    recipient = models.ForeignKey('accounts.CustomUser', on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=20, choices=TYPES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    
    target_id = models.UUIDField(null=True, blank=True)
    target_type = models.CharField(max_length=50, blank=True)

    objects = TenantManager()

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.type} for {self.recipient.email}"
    
    def mark_as_read(self):
        if not self.is_read:
            self.is_read = True
            self.save()

class TenantModule(BaseUUIDModel):
    tenant = models.ForeignKey('entities.Entity', on_delete=models.CASCADE, related_name='tenant_modules')
    module = models.ForeignKey(AppModule, on_delete=models.CASCADE, related_name='tenant_modules')
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('tenant', 'module')
        verbose_name = 'Tenant Module'
        verbose_name_plural = 'Tenant Modules'

    def __str__(self):
        return f"{self.tenant.brand_name} - {self.module.name} ({'Active' if self.is_active else 'Inactive'})"
