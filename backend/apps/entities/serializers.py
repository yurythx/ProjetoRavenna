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
        ]
