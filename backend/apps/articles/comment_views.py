from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, AllowAny, IsAdminUser
from drf_spectacular.utils import extend_schema, OpenApiParameter
from .models import Comment, Article
from .comment_serializers import CommentSerializer, CommentDetailSerializer

class CommentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing comments
    - List: GET all comments for an article
    - Create: POST new comment (authenticated)
    - Delete: DELETE own comment (authenticated)
    """
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    def get_permissions(self):
        if self.action in ['create']:
            return [AllowAny()]
        return super().get_permissions()
    
    def get_queryset(self):
        queryset = Comment.objects.filter(is_approved=True).select_related('author', 'article')
        
        # Filter by article
        article_id = self.request.query_params.get('article')
        if article_id:
            queryset = queryset.filter(article_id=article_id)
        
        # Only top-level comments (not replies)
        parent_only = self.request.query_params.get('parent_only', 'false')
        if parent_only.lower() == 'true':
            queryset = queryset.filter(parent__isnull=True)
        
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'list':
            return CommentDetailSerializer  # Include replies
        return CommentSerializer
    
    @extend_schema(
        parameters=[
            OpenApiParameter('article', str, description='Filter by article ID'),
            OpenApiParameter('parent_only', bool, description='Only top-level comments'),
        ]
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
    
    def perform_create(self, serializer):
        # Simple rate limiting for guests (30s per IP)
        user = self.request.user
        from django.core.cache import cache
        ip = self.request.META.get('REMOTE_ADDR') or 'unknown'
        if not user.is_authenticated:
            key = f"comment_rate:{ip}"
            if cache.get(key):
                from rest_framework.exceptions import Throttled
                raise Throttled(detail="Muitas tentativas. Tente novamente em instantes.")
            cache.set(key, True, 30)
        comment = serializer.save(author=user if user.is_authenticated else None)
        from django.db import transaction
        from apps.core.notification_utils import notify_comment_reply, notify_article_comment
        def _notify():
            if comment.is_approved:
                if comment.parent:
                    notify_comment_reply(comment)
                else:
                    notify_article_comment(comment)
        transaction.on_commit(_notify)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def approve(self, request, pk=None):
        """Approve a guest comment"""
        comment = self.get_object()
        comment.is_approved = True
        comment.save(update_fields=['is_approved'])
        from apps.core.notification_utils import notify_comment_reply, notify_article_comment
        if comment.parent:
            notify_comment_reply(comment)
        else:
            notify_article_comment(comment)
        return Response({'status': 'approved'})
    
    def destroy(self, request, *args, **kwargs):
        comment = self.get_object()
        
        # Check permission
        if comment.author != request.user and not request.user.is_staff:
            return Response(
                {"detail": "Você não tem permissão para deletar este comentário."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().destroy(request, *args, **kwargs)
