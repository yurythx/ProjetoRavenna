from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.core.validators import RegexValidator
from django.core.exceptions import ValidationError
from apps.core.models import BaseUUIDModel, SlugMixin

class Entity(BaseUUIDModel, SlugMixin):
    ORDER_TYPE_CHOICES = (
        ('PF', 'Pessoa Física'),
        ('PJ', 'Pessoa Jurídica'),
    )
    
    DEFAULT_LANGUAGE_CHOICES = (
        ('pt-br', 'Português (Brasil)'),
        ('en', 'English'),
        ('es', 'Español'),
    )
    
    hex_color_validator = RegexValidator(
        regex=r'^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$',
        message='Enter a valid hex color code (e.g., #FFFFFF or #FFF)'
    )
    
    name = models.CharField(max_length=255)
    entity_type = models.CharField(max_length=2, choices=ORDER_TYPE_CHOICES, default='PF')
    tax_id = models.CharField(max_length=50, blank=True, null=True, help_text="CPF or CNPJ")
    
    # White-Label Fields
    domain = models.CharField("Domínio/Subdomínio", max_length=255, unique=True, null=True, blank=True)
    brand_name = models.CharField("Nome da Marca", max_length=100, null=True, blank=True)
    primary_color = models.CharField(
        "Cor Primária", 
        max_length=7, 
        default="#44B78B",
        validators=[hex_color_validator]
    )
    secondary_color = models.CharField(
        "Cor Secundária", 
        max_length=7, 
        default="#2D3748",
        validators=[hex_color_validator]
    )
    primary_color_dark = models.CharField(
        "Cor Primária (Dark Mode)", 
        max_length=7, 
        default="#44B78B",
        validators=[hex_color_validator],
        help_text="Cor primária para dark mode (opcional)"
    )
    secondary_color_dark = models.CharField(
        "Cor Secundária (Dark Mode)", 
        max_length=7, 
        default="#0C4B33",
        validators=[hex_color_validator],
        help_text="Cor secundária para dark mode (opcional)"
    )
    logo = models.ImageField(upload_to='tenants/logos/', null=True, blank=True)
    favicon = models.ImageField(upload_to='tenants/favicons/', null=True, blank=True)
    
    default_language = models.CharField(
        "Idioma Padrão",
        max_length=10,
        choices=DEFAULT_LANGUAGE_CHOICES,
        default='pt-br'
    )
    
    footer_text = models.TextField(blank=True, default='')
    social_links = models.JSONField(default=dict, blank=True)
    
    # SMTP Configuration
    smtp_host = models.CharField("SMTP Host", max_length=255, null=True, blank=True)
    smtp_port = models.IntegerField("SMTP Port", null=True, blank=True)
    smtp_user = models.CharField("SMTP User", max_length=255, null=True, blank=True)
    smtp_password = models.CharField("SMTP Password", max_length=255, null=True, blank=True, help_text="Will be stored as plain text for now, consider encryption later.")
    smtp_use_tls = models.BooleanField("Use TLS", default=True)
    email_from_address = models.EmailField("Email From Address", null=True, blank=True)
    email_from_name = models.CharField("Email From Name", max_length=255, null=True, blank=True)
    
    onboarding_completed = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    def clean(self):
        """Validate color fields"""
        super().clean()
        if self.primary_color and not self.primary_color.startswith('#'):
            raise ValidationError({'primary_color': 'Color must start with #'})
        if self.secondary_color and not self.secondary_color.startswith('#'):
            raise ValidationError({'secondary_color': 'Color must start with #'})
        if self.primary_color_dark and not self.primary_color_dark.startswith('#'):
            raise ValidationError({'primary_color_dark': 'Color must start with #'})
        if self.secondary_color_dark and not self.secondary_color_dark.startswith('#'):
            raise ValidationError({'secondary_color_dark': 'Color must start with #'})
    
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
