from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from .models import Article, Category, Tag
from .serializers import ArticleSerializer, CategorySerializer, TagSerializer
from .services import article_create, article_update
from .selectors import article_list
from .filters import ArticleFilter
from apps.core.permissions import IsAdminOrReadOnly
from .permissions import IsOwnerOrAdminOrReadOnly
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.views import APIView
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    lookup_field = 'slug'
    permission_classes = [IsAdminOrReadOnly]

class TagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    lookup_field = 'slug'
    permission_classes = [IsAdminOrReadOnly]

class ArticleViewSet(viewsets.ModelViewSet):
    # Standard queryset for metadata
    queryset = Article.objects.all()
    serializer_class = ArticleSerializer
    lookup_field = 'slug'
    permission_classes = [IsAuthenticatedOrReadOnly, IsOwnerOrAdminOrReadOnly]
    
    # Filters
    filterset_class = ArticleFilter
    search_fields = ['title', 'content']
    ordering_fields = ['created_at', 'title']
    ordering = ['-created_at']

    def create(self, request, *args, **kwargs):
        # 1. Validation (Serializer)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        
        # 2. Service Layer
        tags = data.get('tags', None) 
        
        # Check permissions explicitly or rely on DRF's perform_create hook? 
        # Standard ViewSet checks permissions before entering create.
        
        article = article_create(
            title=data['title'],
            content=data['content'],
            category=data['category'],
            author=request.user if request.user.is_authenticated else None,
            tags=tags,
            is_published=data.get('is_published', False),
            banner=data.get('banner', None)
        )
        
        return Response(ArticleSerializer(article).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object() 
        # get_object() checks object permissions (IsOwnerOrAdminOrReadOnly)
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        # We use strict service for updates too
        article = article_update(instance, **serializer.validated_data)

        return Response(ArticleSerializer(article).data)

    def list(self, request, *args, **kwargs):
        # 1. Selector Layer: Get optimized queryset with visibility logic
        # article_list selector now requires 'user' argument to determine visibility
        qs = article_list(user=request.user)
             
        # 2. Filter Layer: Apply DRF filters (DjangoFilter, Search, Ordering)
        # filter_queryset will apply the backends defined in settings + view attributes
        qs = self.filter_queryset(qs)

        # 3. Pagination & Response
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

class UploadImageView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def post(self, request, *args, **kwargs):
        file = request.FILES.get('file')
        if not file:
            return Response({'detail': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        if not str(file.content_type).startswith('image/'):
            return Response({'detail': 'Invalid file type'}, status=status.HTTP_400_BAD_REQUEST)
        max_bytes = 5 * 1024 * 1024
        if file.size > max_bytes:
            return Response({'detail': 'File too large (max 5MB)'}, status=status.HTTP_400_BAD_REQUEST)
        path = default_storage.save(f'articles/uploads/{file.name}', ContentFile(file.read()))
        from django.conf import settings
        url = settings.MEDIA_URL + path.replace('\\', '/')
        return Response({'location': url}, status=status.HTTP_201_CREATED)
