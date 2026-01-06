from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from .like_models import ArticleLike, ArticleFavorite
from .models import Article
from .serializers import ArticleSerializer


class LikeViewSet(viewsets.ViewSet):
    """
    ViewSet for article like functionality
    """
    
    def get_permissions(self):
        """
        Allow anyone to view likes, but require authentication to toggle
        """
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAuthenticated()]
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def toggle(self, request):
        """
        Toggle like on an article.
        Creates like if doesn't exist, deletes if exists.
        
        Request body: {"article_id": "uuid"}
        Returns: {"liked": true/false, "like_count": int}
        """
        article_id = request.data.get('article_id')
        
        if not article_id:
            return Response(
                {'error': 'article_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        article = get_object_or_404(Article, id=article_id, is_published=True)
        
        # Check if like exists
        like_exists = ArticleLike.objects.filter(
            article=article,
            user=request.user
        ).exists()
        
        if like_exists:
            # Unlike: delete the like
            ArticleLike.objects.filter(
                article=article,
                user=request.user
            ).delete()
            liked = False
        else:
            # Like: create the like
            ArticleLike.objects.create(
                article=article,
                user=request.user
            )
            liked = True
        
        # Get updated like count
        like_count = article.likes.count()
        
        return Response({
            'liked': liked,
            'like_count': like_count,
            'article_id': str(article.id)
        })


class FavoriteViewSet(viewsets.ViewSet):
    """
    ViewSet for article favorite/bookmark functionality
    """
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def toggle(self, request):
        """
        Toggle favorite on an article.
        Creates favorite if doesn't exist, deletes if exists.
        
        Request body: {"article_id": "uuid"}
        Returns: {"favorited": true/false, "favorite_count": int}
        """
        article_id = request.data.get('article_id')
        
        if not article_id:
            return Response(
                {'error': 'article_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        article = get_object_or_404(Article, id=article_id, is_published=True)
        
        # Check if favorite exists
        favorite_exists = ArticleFavorite.objects.filter(
            article=article,
            user=request.user
        ).exists()
        
        if favorite_exists:
            # Unfavorite: delete the favorite
            ArticleFavorite.objects.filter(
                article=article,
                user=request.user
            ).delete()
            favorited = False
        else:
            # Favorite: create the favorite
            ArticleFavorite.objects.create(
                article=article,
                user=request.user
            )
            favorited = True
        
        # Get updated favorite count (total for the article)
        favorite_count = article.favorites.count()
        
        return Response({
            'favorited': favorited,
            'favorite_count': favorite_count,
            'article_id': str(article.id)
        })
    
    def list(self, request):
        """
        List user's favorited articles
        
        Returns: List of articles that the user has favorited
        """
        # Get all favorites for the current user
        favorites = ArticleFavorite.objects.filter(
            user=request.user
        ).select_related('article')
        
        # Extract articles from favorites
        articles = [fav.article for fav in favorites if fav.article.is_published]
        
        # Serialize articles
        serializer = ArticleSerializer(
            articles,
            many=True,
            context={'request': request}
        )
        
        return Response({
            'count': len(articles),
            'results': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def check(self, request):
        """
        Check if an article is favorited by the user
        
        Query params: article_id
        Returns: {"is_favorited": true/false}
        """
        article_id = request.query_params.get('article_id')
        
        if not article_id:
            return Response(
                {'error': 'article_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        article = get_object_or_404(Article, id=article_id)
        
        is_favorited = ArticleFavorite.objects.filter(
            article=article,
            user=request.user
        ).exists()
        
        return Response({'is_favorited': is_favorited})
