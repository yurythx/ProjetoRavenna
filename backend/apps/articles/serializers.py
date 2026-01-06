from rest_framework import serializers
from .models import Article, Category, Tag

class CategorySerializer(serializers.ModelSerializer):
    article_count = serializers.IntegerField(read_only=True, default=0)
    
    class Meta:
        model = Category
        fields = '__all__'

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
        source='tags'
    )
    can_edit = serializers.SerializerMethodField()
    author_name = serializers.SerializerMethodField()
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
        fields = '__all__'
        # Includes can_edit and standard fields
        read_only_fields = ('slug', 'author', 'created_at', 'updated_at', 'can_edit')

    def validate_title(self, value):
        if len(value) < 5:
            raise serializers.ValidationError("Title must be at least 5 characters long.")
        return value

    def get_can_edit(self, obj) -> bool:
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return request.user.is_superuser or obj.author == request.user

    def get_author_name(self, obj) -> str:
        if obj.author:
            return obj.author.get_full_name() or obj.author.username
        return "Desconhecido"
    
    def get_like_count(self, obj) -> int:
        """Get total likes for this article"""
        return obj.likes.count()
    
    def get_is_liked(self, obj) -> bool:
        """Check if current user has liked this article"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user).exists()
        return False
    
    def get_favorite_count(self, obj) -> int:
        """Get total favorites for this article (private, returns 0)"""
        # Favorite count is private, only show if user is the one favoriting
        return 0  # We don't expose this publicly
    
    def get_is_favorited(self, obj) -> bool:
        """Check if current user has favorited this article"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.favorites.filter(user=request.user).exists()
        return False
    
    # Analytics methods
    
    def get_view_count(self, obj) -> int:
        """Get total view count (cached)"""
        return obj.get_view_count()
    
    def get_unique_views(self, obj) -> int:
        """Get unique visitor count"""
        return obj.get_unique_views()
    
    def get_reading_time(self, obj) -> int:
        """Get estimated reading time in minutes"""
        return obj.calculate_reading_time()
    
    def get_engagement_rate(self, obj) -> float:
        """Get engagement rate percentage"""
        return obj.get_engagement_rate()

