from rest_framework import serializers
from .models import Comment
from apps.accounts.profile_serializers import UserProfileSerializer
from django.utils.html import strip_tags
import re
from django.conf import settings
import urllib.request
import urllib.parse
import json

class CommentSerializer(serializers.ModelSerializer):
    author = UserProfileSerializer(read_only=True)
    replies_count = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()
    guest_name = serializers.CharField(required=False, allow_blank=True, max_length=120, write_only=True)
    guest_email = serializers.EmailField(required=False, allow_blank=True, write_only=True)
    guest_phone = serializers.CharField(required=False, allow_blank=True, max_length=32, write_only=True)
    hp = serializers.CharField(required=False, allow_blank=True, write_only=True)
    captcha = serializers.CharField(required=False, allow_blank=True, write_only=True)
    
    class Meta:
        model = Comment
        fields = ['id', 'article', 'author', 'parent', 'content', 'created_at', 'is_reply', 'replies_count', 'can_delete', 'guest_name', 'guest_email', 'guest_phone', 'hp', 'captcha', 'is_approved']
        read_only_fields = ['id', 'author', 'created_at', 'is_reply', 'is_approved']
    
    def get_replies_count(self, obj):
        return obj.replies.filter(is_approved=True).count()
    
    def get_can_delete(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.author == request.user or request.user.is_staff
    
    def validate(self, attrs):
        request = self.context.get('request')
        content = attrs.get('content') or ''
        # Sanitize content: strip HTML
        attrs['content'] = strip_tags(content)
        # Honeypot: if filled, reject silently
        hp = (attrs.get('hp') or '').strip()
        if hp:
            raise serializers.ValidationError("Falha na validação.")
        if request and request.user.is_authenticated:
            return attrs
        # Guest validation: require name, email, phone
        name = attrs.get('guest_name', '').strip()
        email = (attrs.get('guest_email') or '').strip()
        phone = (attrs.get('guest_phone') or '').strip()
        if not (name and email and phone):
            raise serializers.ValidationError("Para comentar sem login, informe nome, e-mail e telefone.")
        # Basic phone validation: digits, length 8-16
        digits = re.sub(r'\D+', '', phone)
        if len(digits) < 8 or len(digits) > 16:
            raise serializers.ValidationError("Telefone inválido.")
        token = (attrs.get('captcha') or '').strip()
        if not token:
            raise serializers.ValidationError("Validação de segurança obrigatória.")
        if not self._verify_captcha(token, request):
            raise serializers.ValidationError("Falha na validação de segurança.")
        return attrs
    
    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['author'] = request.user
            validated_data['is_approved'] = True
        else:
            # Guest comment requires moderation
            validated_data['is_approved'] = False
        return super().create(validated_data)

    def _verify_captcha(self, token, request):
        provider = getattr(settings, 'CAPTCHA_PROVIDER', '').lower()
        secret = getattr(settings, 'CAPTCHA_SECRET', '')
        remoteip = request.META.get('REMOTE_ADDR') if request else None
        if not provider or not secret:
            return False
        if provider == 'hcaptcha':
            url = 'https://hcaptcha.com/siteverify'
            payload = {'secret': secret, 'response': token}
            if remoteip:
                payload['remoteip'] = remoteip
        elif provider == 'recaptcha':
            url = 'https://www.google.com/recaptcha/api/siteverify'
            payload = {'secret': secret, 'response': token}
            if remoteip:
                payload['remoteip'] = remoteip
        else:
            return False
        data = urllib.parse.urlencode(payload).encode('utf-8')
        try:
            req = urllib.request.Request(url, data=data)
            with urllib.request.urlopen(req, timeout=5) as resp:
                body = resp.read()
            obj = json.loads(body.decode('utf-8'))
            return bool(obj.get('success'))
        except Exception:
            return False

class CommentDetailSerializer(CommentSerializer):
    """Serializer with nested replies"""
    replies = serializers.SerializerMethodField()
    
    class Meta(CommentSerializer.Meta):
        fields = CommentSerializer.Meta.fields + ['replies']
    
    def get_replies(self, obj):
        if obj.is_reply:  # Don't nest replies of replies
            return []
        replies = obj.replies.filter(is_approved=True).order_by('created_at')
        return CommentSerializer(replies, many=True, context=self.context).data
