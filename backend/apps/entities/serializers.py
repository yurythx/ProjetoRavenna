from rest_framework import serializers
from .models import Entity

class EntityConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = Entity
        fields = [
            'name',
            'brand_name',
            'domain',
            'primary_color',
            'secondary_color',
            'primary_color_dark',
            'secondary_color_dark',
            'logo',
            'favicon',
            'footer_text',
            'social_links',
            'default_language',
            'email_from_name',
            'email_from_address',
            'smtp_host',
            'smtp_port',
            'smtp_user',
            'smtp_password',
            'smtp_use_tls',
            'onboarding_completed',
        ]
