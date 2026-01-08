from rest_framework import serializers
from .models import AppModule

class AppModuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppModule
        fields = ['id', 'name', 'slug', 'display_name', 'is_active', 'is_system_module', 'config_json']
        read_only_fields = ['id', 'name', 'slug', 'is_system_module']
