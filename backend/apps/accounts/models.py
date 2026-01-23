from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.validators import RegexValidator
from django_resized import ResizedImageField
from apps.core.models import BaseUUIDModel

class CustomUser(BaseUUIDModel, AbstractUser):
    # username is provided by AbstractUser but we want to make it optional/nullable initially to support existing users
    # However, to allow login by username, it should be unique.
    username = models.CharField(
        'username',
        max_length=150,
        unique=True,
        null=True,
        blank=True,
        help_text='Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only.',
        error_messages={
            'unique': 'A user with that username already exists.',
        },
    )
    email = models.EmailField('email address', unique=True)
    
    avatar = ResizedImageField(
        size=[400, 400],
        crop=['middle', 'center'],
        quality=90,
        upload_to='avatars/',
        force_format='WEBP',
        blank=True,
        null=True,
        help_text='User profile picture (will be resized to 400x400 WEBP)'
    )

    # UI Preferences
    THEME_CHOICES = (
        ('light', 'Claro'),
        ('dark', 'Escuro'),
        ('system', 'Sistema'),
    )

    hex_color_validator = RegexValidator(
        regex=r'^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$',
        message='Enter a valid hex color code (e.g., #FFFFFF or #FFF)'
    )

    theme_preference = models.CharField(
        "Preferência de Tema",
        max_length=10,
        choices=THEME_CHOICES,
        default='system'
    )
    primary_color = models.CharField(
        "Cor Primária Personalizada", 
        max_length=7, 
        null=True, 
        blank=True,
        validators=[hex_color_validator]
    )
    secondary_color = models.CharField(
        "Cor Secundária Personalizada", 
        max_length=7, 
        null=True, 
        blank=True,
        validators=[hex_color_validator]
    )
    primary_color_dark = models.CharField(
        "Cor Primária Personalizada (Dark)", 
        max_length=7, 
        null=True, 
        blank=True,
        validators=[hex_color_validator]
    )
    secondary_color_dark = models.CharField(
        "Cor Secundária Personalizada (Dark)", 
        max_length=7, 
        null=True, 
        blank=True,
        validators=[hex_color_validator]
    )

    bio = models.TextField(
        'biography',
        blank=True,
        default='',
        help_text='Short biography for the user profile.'
    )

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    # Resolving MRO and id field conflicts:
    # AbstractUser doesn't explicitly define 'id', AbstractBaseUser doesn't either (models.Model does).
    # BaseUUIDModel defines 'id'.
    # We should ensure settings.AUTH_USER_MODEL is set.
    
    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return self.email

class TenantMembership(BaseUUIDModel):
    class Role(models.TextChoices):
        OWNER = 'OWNER', 'Owner'
        EDITOR = 'EDITOR', 'Editor'
        MEMBER = 'MEMBER', 'Member'

    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='memberships')
    tenant = models.ForeignKey('entities.Entity', on_delete=models.CASCADE, related_name='memberships')
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.MEMBER)

    class Meta:
        unique_together = ('user', 'tenant')
        verbose_name = 'Tenant Membership'
        verbose_name_plural = 'Tenant Memberships'

    def __str__(self):
        return f"{self.user.email} - {self.tenant.brand_name} ({self.get_role_display()})"
