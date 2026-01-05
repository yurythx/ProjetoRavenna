from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly
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
        comment = serializer.save(author=self.request.user)
        
        # Send notifications
        from apps.core.notification_utils import notify_comment_reply, notify_article_comment
        
        if comment.parent:
            notify_comment_reply(comment)
        else:
            notify_article_comment(comment)
    
    def destroy(self, request, *args, **kwargs):
        comment = self.get_object()
        
        # Check permission
        if comment.author != request.user and not request.user.is_staff:
            return Response(
                {"detail": "Você não tem permissão para deletar este comentário."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().destroy(request, *args, **kwargs)
