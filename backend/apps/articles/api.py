from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from .models import Article, Category, Tag
from .serializers import ArticleSerializer, CategorySerializer, TagSerializer, ImageUploadSerializer
from .services import article_create, article_update
from .selectors import article_list, article_detail
from .filters import ArticleFilter
from apps.core.permissions import IsAdminOrReadOnly
from .permissions import IsOwnerOrAdminOrReadOnly
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.views import APIView
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from rest_framework.throttling import ScopedRateThrottle
import uuid
import os

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
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
        # Validation (Serializer will handle content_json parsing automatically)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated_data = serializer.validated_data
        
        # 2. Service Layer
        # Handle both 'tags' (direct list) and 'tag_ids' (from serializer source)
        tags = validated_data.get('tags', [])
        
        try:
            # Check permissions explicitly or rely on DRF's perform_create hook? 
            # Standard ViewSet checks permissions before entering create.
            
            article = article_create(
                title=validated_data['title'],
                content=validated_data.get('content', ''),
                content_json=validated_data.get('content_json', {}),
                category=validated_data['category'],
                author=request.user if request.user.is_authenticated else None,
                tags=tags,
                status=validated_data.get('status', 'DRAFT'),
                banner=validated_data.get('banner', None),
                excerpt=validated_data.get('excerpt', '')
            )
            
            return Response(ArticleSerializer(article).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            # Log the full error to console/file for debugging
            import traceback
            traceback.print_exc()
            return Response(
                {"detail": "Erro ao criar artigo. Por favor, tente novamente.", "error": str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object() 
        # get_object() checks object permissions (IsOwnerOrAdminOrReadOnly)
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        try:
            # We use strict service for updates too
            article = article_update(instance, **serializer.validated_data)
            return Response(ArticleSerializer(article).data)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {"detail": "Erro ao atualizar artigo.", "error": str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

    def retrieve(self, request, *args, **kwargs):
        """
        Retrieve single article with visibility rules:
        - Admin: Can view any article
        - Authenticated: Can view published + own drafts
        - Anonymous: Can view published only
        """
        slug = kwargs.get('slug')
        article = article_detail(slug=slug, user=request.user)
        
        if not article:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        
        # Apply visibility rules
        user = request.user
        
        # Admin sees everything
        if not (user.is_authenticated and user.is_superuser):
            # Non-admin users
            if article.status == 'PUBLISHED':
                # Published article - everyone can see
                pass
            elif user.is_authenticated and article.author == user:
                # Own draft - author can see
                pass
            else:
                # Unpublished article from another author - forbidden
                return Response(
                    {'detail': 'You do not have permission to view this draft.'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        
        serializer = self.get_serializer(article)
        return Response(serializer.data)

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
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'uploads'

    def post(self, request, *args, **kwargs):
        serializer = ImageUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        file = serializer.validated_data['file']
        
        # Generate UUID filename to prevent collisions and information leakage
        ext = os.path.splitext(file.name)[1].lower()
        if not ext:
            ext = '.jpg' # Fallback
            
        filename = f"{uuid.uuid4()}{ext}"
        tenant_id = getattr(request, 'tenant_id', 'shared')
        path = default_storage.save(f'tenant_{tenant_id}/articles/uploads/{filename}', ContentFile(file.read()))
        
        # Use storage.url() to get the correct URL (works with both local and MinIO)
        url = default_storage.url(path)
        # Ensure URL is absolute for the frontend (especially for TinyMCE)
        if url.startswith('/'):
            url = request.build_absolute_uri(url)
            
        return Response({'location': url}, status=status.HTTP_201_CREATED)
