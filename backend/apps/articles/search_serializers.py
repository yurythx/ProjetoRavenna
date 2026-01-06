from rest_framework import serializers
from .models import Article
from .serializers import ArticleSerializer


class SearchResultSerializer(ArticleSerializer):
    """
    Serializer for search results with additional search-specific fields
    """
    rank = serializers.FloatField(read_only=True, required=False)
    headline = serializers.SerializerMethodField()
    
    class Meta(ArticleSerializer.Meta):
        fields = list(ArticleSerializer.Meta.fields) + ['rank', 'headline']
    
    def get_headline(self, obj):
        """
        Return a highlighted excerpt of the content showing matched search terms
        """
        # Get search query from context
        query = self.context.get('search_query', '')
        
        if not query or not hasattr(obj, 'search_headline'):
            # Return first 200 characters as fallback
            return obj.content[:200] + '...' if len(obj.content) > 200 else obj.content
        
        return obj.search_headline


class AutocompleteSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for autocomplete suggestions
    """
    class Meta:
        model = Article
        fields = ['id', 'title', 'slug']
