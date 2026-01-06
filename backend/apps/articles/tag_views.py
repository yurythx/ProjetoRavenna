from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Q
from .models import Tag, Article
from .serializers import TagSerializer, TagDetailSerializer, ArticleSerializer


class TagViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing tags.
    
    Endpoints:
    - GET /api/v1/articles/tags/ - List all tags
    - GET /api/v1/articles/tags/{slug}/ - Get tag details
    - GET /api/v1/articles/tags/{slug}/articles/ - Get articles by tag
    - GET /api/v1/articles/tags/popular/ - Get most popular tags
    - POST /api/v1/articles/tags/ - Create tag (admin only)
    - PUT/PATCH /api/v1/articles/tags/{slug}/ - Update tag (admin only)
    - DELETE /api/v1/articles/tags/{slug}/ - Delete tag (admin only)
    """
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    lookup_field = 'slug'
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        """
        Optimize queryset with article count annotation.
        """
        queryset = Tag.objects.annotate(
            article_count=Count('articles', filter=Q(articles__is_published=True), distinct=True)
        )
        
        # Optional search filter
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(description__icontains=search)
            )
        
        return queryset.order_by('-article_count', 'name')
    
    def get_serializer_class(self):
        """
        Use detailed serializer for retrieve actions.
        """
        if self.action == 'retrieve':
            return TagDetailSerializer
        return TagSerializer
    
    def get_permissions(self):
        """
        Only admins can create, update, or delete tags.
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAdminUser()]
        return [permissions.AllowAny()]
    
    @action(detail=False, methods=['get'], url_path='popular')
    def popular(self, request):
        """
        Get the most popular tags (top 10 by article count).
        """
        popular_tags = self.get_queryset()[:10]
        serializer = self.get_serializer(popular_tags, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'], url_path='articles')
    def articles(self, request, slug=None):
        """
        Get all published articles with this tag.
        """
        tag = self.get_object()
        articles = Article.objects.filter(
            tags=tag,
            is_published=True
        ).select_related('author', 'category').prefetch_related('tags').order_by('-created_at')
        
        # Import here to avoid circular import
        from .article_serializers import ArticleSerializer
        serializer = ArticleSerializer(articles, many=True, context={'request': request})
        
        return Response({
            'tag': TagDetailSerializer(tag).data,
            'articles': serializer.data,
            'count': articles.count()
        })
