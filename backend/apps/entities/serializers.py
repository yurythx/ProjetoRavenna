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
            'logo',
            'favicon',
            'footer_text',
            'social_links',
        ]
