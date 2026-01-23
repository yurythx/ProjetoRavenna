from rest_framework import serializers
from .models import CustomUser
from django.contrib.auth.models import Group, Permission

class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for viewing user profile"""
    class Meta:
        model = CustomUser
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name', 'avatar', 'bio', 
            'date_joined', 'is_staff', 'theme_preference', 
            'primary_color', 'secondary_color', 
            'primary_color_dark', 'secondary_color_dark'
        ]
        read_only_fields = ['id', 'email', 'date_joined', 'is_staff']

class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile"""
    class Meta:
        model = CustomUser
        fields = [
            'username', 'first_name', 'last_name', 'bio', 'theme_preference',
            'primary_color', 'secondary_color', 
            'primary_color_dark', 'secondary_color_dark'
        ]
        
    def validate_username(self, value):
        """Ensure username is unique if provided"""
        user = self.context['request'].user
        if value and CustomUser.objects.exclude(pk=user.pk).filter(username=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

class AvatarUploadSerializer(serializers.ModelSerializer):
    """Serializer for avatar upload"""
    class Meta:
        model = CustomUser
        fields = ['avatar']
        
    def validate_avatar(self, value):
        """Validate avatar file"""
        if value:
            # Check file size (max 5MB)
            if value.size > 5 * 1024 * 1024:
                raise serializers.ValidationError("Avatar file size cannot exceed 5MB.")
            
            # Check file type
            allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
            if value.content_type not in allowed_types:
                raise serializers.ValidationError("Avatar must be a JPEG, PNG, or WEBP image.")
        
        return value

class AdminUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=False)
    groups = serializers.PrimaryKeyRelatedField(queryset=Group.objects.all(), many=True, required=False)
    user_permissions = serializers.PrimaryKeyRelatedField(queryset=Permission.objects.all(), many=True, required=False)
    class Meta:
        model = CustomUser
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name',
            'is_active', 'is_staff', 'date_joined', 'last_login', 'password',
            'groups', 'user_permissions', 'theme_preference',
            'primary_color', 'secondary_color', 
            'primary_color_dark', 'secondary_color_dark'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login']
    
    def validate_email(self, value):
        user = self.instance
        qs = CustomUser.objects.filter(email=value)
        if user:
            qs = qs.exclude(pk=user.pk)
        if qs.exists():
            raise serializers.ValidationError("Email já está em uso.")
        return value
    
    def create(self, validated_data):
        password = validated_data.pop('password', None)
        groups = validated_data.pop('groups', [])
        user_permissions = validated_data.pop('user_permissions', [])
        # username may be optional; ensure unique constraint handled by model
        user = CustomUser(**validated_data)
        if not password:
            raise serializers.ValidationError({"password": "Senha é obrigatória para criação."})
        user.set_password(password)
        user.save()
        if groups:
            user.groups.set(groups)
        if user_permissions:
            user.user_permissions.set(user_permissions)
        return user
    
    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        groups = validated_data.pop('groups', None)
        user_permissions = validated_data.pop('user_permissions', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        if groups is not None:
            instance.groups.set(groups)
        if user_permissions is not None:
            instance.user_permissions.set(user_permissions)
        return instance
