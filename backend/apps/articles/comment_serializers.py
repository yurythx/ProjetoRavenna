from rest_framework import serializers
from .models import Comment
from apps.accounts.profile_serializers import UserProfileSerializer

class CommentSerializer(serializers.ModelSerializer):
    author = UserProfileSerializer(read_only=True)
    replies_count = serializers.SerializerMethodField()
    can_delete = serializers.SerializerMethodField()
    
    class Meta:
        model = Comment
        fields = ['id', 'article', 'author', 'parent', 'content', 'created_at', 'is_reply', 'replies_count', 'can_delete']
        read_only_fields = ['id', 'author', 'created_at', 'is_reply']
    
    def get_replies_count(self, obj):
        return obj.replies.filter(is_approved=True).count()
    
    def get_can_delete(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.author == request.user or request.user.is_staff
    
    def create(self, validated_data):
        validated_data['author'] = self.context['request'].user
        return super().create(validated_data)

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
