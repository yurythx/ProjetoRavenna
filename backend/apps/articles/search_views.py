from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank, SearchHeadline
from django.db.models import Q, F
from datetime import datetime
from .models import Article
from .search_serializers import SearchResultSerializer, AutocompleteSerializer


class ArticleSearchViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for article search functionality
    
    Provides endpoints for:
    - Full-text search with filters
    - Autocomplete suggestions
    """
    permission_classes = [AllowAny]
    serializer_class = SearchResultSerializer
    
    def get_queryset(self):
        """
        Get articles with search filters applied
        """
        queryset = Article.objects.filter(is_published=True).select_related(
            'category', 'author'
        ).prefetch_related('tags')
        
        # Get query parameters
        query = self.request.query_params.get('q', '').strip()
        tags = self.request.query_params.getlist('tags')
        category = self.request.query_params.get('category')
        author = self.request.query_params.get('author')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        ordering = self.request.query_params.get('ordering', 'relevance')
        
        # Apply full-text search if query provided
        if query:
            # Create search query
            search_query = SearchQuery(query, config='portuguese')
            
            # Annotate with search rank
            queryset = queryset.annotate(
                rank=SearchRank(F('search_vector'), search_query)
            ).filter(search_vector=search_query)
            
            # Add search headline for highlighting
            queryset = queryset.annotate(
                search_headline=SearchHeadline(
                    'content',
                    search_query,
                    config='portuguese',
                    start_sel='<mark>',
                    stop_sel='</mark>',
                    max_words=50,
                    min_words=15,
                )
            )
        
        # Apply tag filter
        if tags:
            for tag_slug in tags:
                queryset = queryset.filter(tags__slug=tag_slug)
        
        # Apply category filter
        if category:
            queryset = queryset.filter(category__slug=category)
        
        # Apply author filter
        if author:
            queryset = queryset.filter(author__email__icontains=author)
        
        # Apply date range filters
        if date_from:
            try:
                date_from_obj = datetime.fromisoformat(date_from)
                queryset = queryset.filter(created_at__gte=date_from_obj)
            except ValueError:
                pass
        
        if date_to:
            try:
                date_to_obj = datetime.fromisoformat(date_to)
                queryset = queryset.filter(created_at__lte=date_to_obj)
            except ValueError:
                pass
        
        # Apply ordering
        if query and ordering == 'relevance':
            # Order by search rank (highest first)
            queryset = queryset.order_by('-rank', '-created_at')
        elif ordering == '-created_at':
            queryset = queryset.order_by('-created_at')
        elif ordering == 'created_at':
            queryset = queryset.order_by('created_at')
        else:
            # Default to newest first if no search query
            queryset = queryset.order_by('-created_at')
        
        return queryset.distinct()
    
    def get_serializer_context(self):
        """Add search query to serializer context for highlighting"""
        context = super().get_serializer_context()
        context['search_query'] = self.request.query_params.get('q', '')
        return context
    
    def list(self, request, *args, **kwargs):
        """
        List search results with pagination
        
        Query parameters:
        - q: Search query (searches title and content)
        - tags: Tag slugs (can be multiple, comma-separated or repeated)
        - category: Category slug
        - author: Author email or name
        - date_from: ISO format date (YYYY-MM-DD)
        - date_to: ISO format date (YYYY-MM-DD)
        - ordering: 'relevance', '-created_at', or 'created_at' (default: 'relevance' if query, else '-created_at')
        
        Returns paginated search results with ranking and highlighting
        """
        return super().list(request, *args, **kwargs)
    
    @action(detail=False, methods=['get'])
    def autocomplete(self, request):
        """
        Get autocomplete suggestions based on search query
        
        Returns up to 10 article titles matching the query
        """
        query = request.query_params.get('q', '').strip()
        
        if not query or len(query) < 2:
            return Response({'results': []})
        
        # Search only published articles
        queryset = Article.objects.filter(
            is_published=True
        ).filter(
            Q(title__icontains=query) | Q(search_vector=SearchQuery(query, config='portuguese'))
        ).order_by('-created_at')[:10]
        
        serializer = AutocompleteSerializer(queryset, many=True)
        return Response({'results': serializer.data})
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Get search statistics
        
        Returns:
        - total_results: Total number of results for current filters
        - query: The search query used
        """
        queryset = self.get_queryset()
        
        return Response({
            'total_results': queryset.count(),
            'query': request.query_params.get('q', ''),
            'filters_applied': {
                'tags': request.query_params.getlist('tags'),
                'category': request.query_params.get('category'),
                'author': request.query_params.get('author'),
                'date_from': request.query_params.get('date_from'),
                'date_to': request.query_params.get('date_to'),
            }
        })
