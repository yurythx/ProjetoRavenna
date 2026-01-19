from rest_framework import serializers
from .models import Article, Category, Tag
from django.conf import settings
from PIL import Image
import io
from drf_spectacular.utils import extend_schema_field
from drf_spectacular.types import OpenApiTypes

class ImageUploadSerializer(serializers.Serializer):
    file = serializers.FileField()

    def validate_file(self, value):
        # 1. Check file size
        if value.size > settings.MAX_UPLOAD_SIZE:
            raise serializers.ValidationError(f"File too large. Max size is {settings.MAX_UPLOAD_SIZE / (1024 * 1024):.1f}MB")

        # 2. Check content type header (basic check)
        if not value.content_type.startswith('image/'):
            raise serializers.ValidationError("Invalid file type. Only images are allowed.")

        # 3. Deep check using Pillow (verifies it's a real image)
        try:
            # We use a copy of the file for validation to not consume the stream
            # or just rely on Pillow opening it.
            # Django's UploadedFile is usually seekable.
            img = Image.open(value)
            img.verify()  # Verify it's an image
        except Exception:
            raise serializers.ValidationError("Invalid image file. The file is corrupted or not an image.")

        return value

class CategorySerializer(serializers.ModelSerializer):
    article_count = serializers.IntegerField(read_only=True, default=0)
    
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'article_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at', 'article_count']

class TagSerializer(serializers.ModelSerializer):
    article_count = serializers.IntegerField(read_only=True, default=0)
    
    class Meta:
         model = Tag
         fields = ['id', 'name', 'slug', 'description', 'color', 'article_count', 'created_at', 'updated_at']
         read_only_fields = ['id', 'slug', 'created_at', 'updated_at', 'article_count']

class TagDetailSerializer(serializers.ModelSerializer):
    """
    Detailed Tag serializer including article count.
    """
    article_count = serializers.IntegerField(read_only=True, default=0)
    
    class Meta:
        model = Tag
        fields = ['id', 'name', 'slug', 'description', 'color', 'article_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'slug', 'created_at', 'updated_at', 'article_count']

class ArticleSerializer(serializers.ModelSerializer):
    # Use nested TagSerializer for reading, but accept IDs for writing
    tags = TagSerializer(many=True, read_only=True)
    tag_ids = serializers.PrimaryKeyRelatedField(
        many=True, 
        queryset=Tag.objects.all(), 
        required=False,
        write_only=True,
        source='tags',
        help_text="List of Tag IDs to associate with the article."
    )
    can_edit = serializers.SerializerMethodField()
    author_name = serializers.SerializerMethodField()
    author_avatar = serializers.SerializerMethodField()
    author_bio = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.name', read_only=True)
    
    # Like and Favorite fields
    like_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    favorite_count = serializers.SerializerMethodField()
    is_favorited = serializers.SerializerMethodField()
    
    # Analytics fields
    view_count = serializers.SerializerMethodField()
    unique_views = serializers.SerializerMethodField()
    reading_time = serializers.SerializerMethodField()
    engagement_rate = serializers.SerializerMethodField()
    
    class Meta:
        model = Article
        fields = [
            'id', 'title', 'slug', 'excerpt', 'content', 'category', 'category_name', 
            'tags', 'tag_ids', 'author', 'author_name', 'author_avatar', 'author_bio',
            'banner', 'is_published', 'can_edit', 'like_count', 'is_liked', 
            'favorite_count', 'is_favorited', 'view_count', 'unique_views', 
            'reading_time', 'engagement_rate', 'created_at', 'updated_at'
        ]
        read_only_fields = ('slug', 'author', 'created_at', 'updated_at')

    def validate_title(self, value):
        if len(value) < 5:
            raise serializers.ValidationError("Title must be at least 5 characters long.")
        return value

    @extend_schema_field(OpenApiTypes.BOOL)
    def get_can_edit(self, obj) -> bool:
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return request.user.is_superuser or obj.author == request.user

    @extend_schema_field(OpenApiTypes.STR)
    def get_author_name(self, obj) -> str:
        if obj.author:
            return obj.author.get_full_name() or obj.author.username
        return "Desconhecido"

    @extend_schema_field(OpenApiTypes.STR)
    def get_author_avatar(self, obj) -> str | None:
        if obj.author and obj.author.avatar:
            request = self.context.get('request')
            if request:
                 return request.build_absolute_uri(obj.author.avatar.url)
            return obj.author.avatar.url
        return None

    @extend_schema_field(OpenApiTypes.STR)
    def get_author_bio(self, obj) -> str:
        if obj.author:
            return obj.author.bio
        return ""
    
    @extend_schema_field(OpenApiTypes.INT)
    def get_like_count(self, obj) -> int:
        """Get total likes for this article"""
        # Optimized: Use annotated value if available, else fallback to query
        if hasattr(obj, 'likes_count'):
            return obj.likes_count
        return obj.likes.count()
    
    @extend_schema_field(OpenApiTypes.BOOL)
    def get_is_liked(self, obj) -> bool:
        """Check if current user has liked this article"""
        # Optimized: Use annotated value if available
        if hasattr(obj, 'is_liked_by_user'):
            return obj.is_liked_by_user
            
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user).exists()
        return False
    
    @extend_schema_field(OpenApiTypes.INT)
    def get_favorite_count(self, obj) -> int:
        """Get total favorites for this article (private, returns 0)"""
        # Favorite count is private, only show if user is the one favoriting
        return 0  # We don't expose this publicly
    
    @extend_schema_field(OpenApiTypes.BOOL)
    def get_is_favorited(self, obj) -> bool:
        """Check if current user has favorited this article"""
        # Optimized: Use annotated value if available
        if hasattr(obj, 'is_favorited_by_user'):
            return obj.is_favorited_by_user
            
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.favorites.filter(user=request.user).exists()
        return False
    
    # Analytics methods
    
    @extend_schema_field(OpenApiTypes.INT)
    def get_view_count(self, obj) -> int:
        """Get total view count (cached)"""
        return obj.get_view_count()
    
    @extend_schema_field(OpenApiTypes.INT)
    def get_unique_views(self, obj) -> int:
        """Get unique visitor count"""
        return obj.get_unique_views()
    
    @extend_schema_field(OpenApiTypes.INT)
    def get_reading_time(self, obj) -> int:
        """Get estimated reading time in minutes"""
        return obj.calculate_reading_time()
    
    @extend_schema_field(OpenApiTypes.FLOAT)
    def get_engagement_rate(self, obj) -> float:
        """Get engagement rate percentage"""
        return obj.get_engagement_rate()

