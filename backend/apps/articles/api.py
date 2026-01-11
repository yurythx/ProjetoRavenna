from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from .models import Article, Category, Tag
from .serializers import ArticleSerializer, CategorySerializer, TagSerializer, ImageUploadSerializer
from .services import article_create, article_update
from .selectors import article_list
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
            if article.is_published:
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
        path = default_storage.save(f'articles/uploads/{filename}', ContentFile(file.read()))
        
        # Use storage.url() to get the correct URL (works with both local and MinIO)
        url = default_storage.url(path)
        # Ensure URL is absolute for the frontend (especially for TinyMCE)
        if url.startswith('/'):
            url = request.build_absolute_uri(url)
            
        return Response({'location': url}, status=status.HTTP_201_CREATED)
