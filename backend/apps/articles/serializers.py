from rest_framework import serializers
from .models import Article, Category, Tag

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class TagSerializer(serializers.ModelSerializer):
    class Meta:
         model = Tag
         fields = '__all__'

class ArticleSerializer(serializers.ModelSerializer):
    tags = serializers.PrimaryKeyRelatedField(many=True, queryset=Tag.objects.all(), required=False)
    can_edit = serializers.SerializerMethodField()
    
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

    author_name = serializers.SerializerMethodField()

    def get_author_name(self, obj) -> str:
        if obj.author:
            return obj.author.get_full_name() or obj.author.username
        return "Desconhecido"
