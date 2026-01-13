from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from apps.core.models import BaseUUIDModel, SlugMixin

class Entity(BaseUUIDModel, SlugMixin):
    ORDER_TYPE_CHOICES = (
        ('PF', 'Pessoa Física'),
        ('PJ', 'Pessoa Jurídica'),
    )
    name = models.CharField(max_length=255)
    entity_type = models.CharField(max_length=2, choices=ORDER_TYPE_CHOICES, default='PF')
    tax_id = models.CharField(max_length=50, blank=True, null=True, help_text="CPF or CNPJ")
    
    # White-Label Fields
    domain = models.CharField("Domínio/Subdomínio", max_length=255, unique=True, null=True, blank=True)
    brand_name = models.CharField("Nome da Marca", max_length=100, null=True, blank=True)
    primary_color = models.CharField("Cor Primária", max_length=7, default="#44B78B")
    secondary_color = models.CharField("Cor Secundária", max_length=7, default="#2D3748")
    logo = models.ImageField(upload_to='tenants/logos/', null=True, blank=True)
    favicon = models.ImageField(upload_to='tenants/favicons/', null=True, blank=True)
    
    footer_text = models.TextField(blank=True, default='')
    social_links = models.JSONField(default=dict, blank=True)
    
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.name} ({self.domain})"

class Address(BaseUUIDModel):
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.UUIDField()
    content_object = GenericForeignKey('content_type', 'object_id')
    
    label = models.CharField(max_length=50, help_text="Home, Work, Billing, etc.")
    street = models.CharField(max_length=255)
    number = models.CharField(max_length=20, blank=True)
    complement = models.CharField(max_length=100, blank=True)
    district = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    zip_code = models.CharField(max_length=20)
    
    def __str__(self):
        return f"{self.label} - {self.street}"
