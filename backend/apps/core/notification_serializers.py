from rest_framework import serializers
from .models import Notification
from apps.accounts.profile_serializers import UserProfileSerializer
from django.utils import timezone


class NotificationSerializer(serializers.ModelSerializer):
    sender = UserProfileSerializer(read_only=True)
    time_ago = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id', 'sender', 'notification_type', 'title', 
            'message', 'link', 'is_read', 'read_at', 
            'created_at', 'time_ago'
        ]
        read_only_fields = ['id', 'created_at', 'read_at']
    
    def get_time_ago(self, obj):
        diff = timezone.now() - obj.created_at
        seconds = diff.total_seconds()
        
        if seconds < 60:
            return 'agora'
        elif seconds < 3600:
            return f'há {int(seconds // 60)} min'
        elif seconds < 86400:
            return f'há {int(seconds // 3600)} h'
        elif diff.days < 7:
            return f'há {diff.days} dias'
        else:
            return obj.created_at.strftime('%d/%m/%Y')
