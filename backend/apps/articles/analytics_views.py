"""
Analytics ViewSet for article tracking and statistics.

Provides endpoints for:
- Tracking article views (with privacy controls)
- Fetching article statistics
- Dashboard analytics for authors/admins
"""

import hashlib
from datetime import timedelta

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.shortcuts import get_object_or_404
from django.core.cache import cache
from django.db.models import Count, Avg, F, Q
from django.utils import timezone

from .models import Article
from .analytics_models import ArticleView, ReadingSession


class ArticleAnalyticsViewSet(viewsets.ViewSet):
    """
    ViewSet for analytics endpoints.
    
    Endpoints:
    - POST /articles/{id}/track-view/ - Track article view
    - GET /articles/{id}/stats/ - Get article statistics
    - GET /analytics/dashboard/ - Dashboard statistics (authenticated)
    """
    
    # Required for DRF router to work with detail actions
    queryset = Article.objects.all()
    
    def get_object(self):
        """
        Get the article instance for detail actions.
        """
        article_id = self.kwargs.get('pk')
        return get_object_or_404(Article, pk=article_id)
    
    def get_client_ip(self, request):
        """
        Extract client IP from request.
        Handles proxy headers (X-Forwarded-For).
        """
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', '')
        return ip
    
    def hash_ip(self, ip):
        """Hash IP address using SHA256 for privacy."""
        return hashlib.sha256(ip.encode()).hexdigest()
    
    @action(detail=True, methods=['post'], permission_classes=[AllowAny])
    def track_view(self, request, pk=None):
        """
        Track an article view with privacy controls.
        
        POST /articles/{id}/track-view/
        Body: {
            "reading_progress": 0-100,  # optional
            "time_spent": seconds       # optional
        }
        
        Returns:
        {
            "tracked": true,
            "unique": true|false,
            "message": "..."
        }
        """
        article = get_object_or_404(Article, pk=pk)
        
        # If article is not published, avoid loud errors: silently ignore for non-author users
        if not article.is_published and not (request.user.is_authenticated and (request.user.is_staff or article.author_id == request.user.id)):
            return Response({
                'tracked': False,
                'unique': False,
                'message': 'Unpublished article, tracking ignored'
            }, status=status.HTTP_200_OK)
        
        # Respect Do Not Track header
        if request.META.get('HTTP_DNT') == '1':
            return Response({
                'tracked': False,
                'unique': False,
                'message': 'DNT enabled'
            }, status=status.HTTP_200_OK)
        
        # Ensure session exists
        if not request.session.session_key:
            request.session.create()
        session_id = request.session.session_key
        
        # Hash IP for deduplication
        ip = self.get_client_ip(request)
        ip_hash = self.hash_ip(ip)
        
        # Check cache to prevent duplicate tracking in same session (1 hour window)
        cache_key = f'view_tracked:{session_id}:{article.id}'
        cached_view = cache.get(cache_key)
        
        if cached_view:
            # Update existing view if progress/time increased
            try:
                view = ArticleView.objects.get(id=cached_view)
                updated = False
                
                new_progress = request.data.get('reading_progress', 0)
                new_time = request.data.get('time_spent', 0)
                
                if new_progress > view.reading_progress:
                    view.reading_progress = new_progress
                    updated = True
                
                if new_time > 0:
                    view.time_spent += new_time
                    updated = True
                
                if updated:
                    view.save(update_fields=['reading_progress', 'time_spent', 'updated_at'])
                
                return Response({
                    'tracked': True,
                    'unique': False,
                    'message': 'View updated'
                })
            except ArticleView.DoesNotExist:
                # Cache was invalid, continue to create new view
                pass
        
        # Check if view already exists in DB (fallback)
        existing_view = ArticleView.objects.filter(
            session_id=session_id,
            article=article
        ).first()
        
        if existing_view:
            # Update existing view
            new_progress = request.data.get('reading_progress', 0)
            new_time = request.data.get('time_spent', 0)
            
            if new_progress > existing_view.reading_progress:
                existing_view.reading_progress = new_progress
            
            if new_time > 0:
                existing_view.time_spent += new_time
            
            existing_view.save(update_fields=['reading_progress', 'time_spent', 'updated_at'])
            
            # Update cache
            cache.set(cache_key, str(existing_view.id), timeout=3600)
            
            return Response({
                'tracked': True,
                'unique': False,
                'message': 'Existing view updated'
            })
        
        # Create new view
        view = ArticleView.objects.create(
            article=article,
            user=request.user if request.user.is_authenticated else None,
            session_id=session_id,
            ip_hash=ip_hash,
            user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
            referer=request.META.get('HTTP_REFERER', '')[:500],
            reading_progress=request.data.get('reading_progress', 0),
            time_spent=request.data.get('time_spent', 0)
        )
        
        # Cache the view ID to prevent duplicates (1 hour)
        cache.set(cache_key, str(view.id), timeout=3600)
        
        # Invalidate article view count cache
        cache.delete(f'article:{article.id}:views')
        
        return Response({
            'tracked': True,
            'unique': True,
            'message': 'New view tracked'
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'], permission_classes=[AllowAny])
    def stats(self, request, pk=None):
        """
        Get article statistics.
        
        GET /articles/{id}/stats/
        
        Returns:
        {
            "view_count": 1234,
            "unique_views": 567,
            "reading_time": 5,
            "engagement_rate": 12.5,
            "like_count": 89,
            "comment_count": 45
        }
        """
        article = get_object_or_404(Article, pk=pk)
        
        return Response({
            'view_count': article.get_view_count(),
            'unique_views': article.get_unique_views(),
            'reading_time': article.calculate_reading_time(),
            'engagement_rate': article.get_engagement_rate(),
            'like_count': article.likes.count(),
            'comment_count': article.comments.filter(is_approved=True).count(),
        })
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def dashboard(self, request):
        """
        Get dashboard statistics for authors/admins.
        
        GET /analytics/dashboard/
        
        Returns:
        {
            "total_views": 12345,
            "total_articles": 23,
            "recent_views": 456,
            "average_views": 537,
            "top_articles": [...]
        }
        """
        user = request.user
        
        # Get user's articles if author, all if admin
        if user.is_staff:
            articles = Article.objects.filter(is_published=True)
        else:
            articles = Article.objects.filter(author=user, is_published=True)
        
        if not articles.exists():
            return Response({
                'total_views': 0,
                'total_articles': 0,
                'recent_views': 0,
                'average_views': 0,
                'top_articles': []
            })
        
        # Calculate totals
        total_articles = articles.count()
        total_views = sum(a.get_view_count() for a in articles)
        
        # Recent views (last 7 days)
        seven_days_ago = timezone.now() - timedelta(days=7)
        recent_views = ArticleView.objects.filter(
            article__in=articles,
            created_at__gte=seven_days_ago
        ).count()
        
        # Top performing articles (by views)
        articles_with_views = [
            {
                'article': article,
                'views': article.get_view_count()
            }
            for article in articles
        ]
        articles_with_views.sort(key=lambda x: x['views'], reverse=True)
        top_articles = articles_with_views[:5]
        
        return Response({
            'total_views': total_views,
            'total_articles': total_articles,
            'recent_views': recent_views,
            'average_views': round(total_views / total_articles, 1) if total_articles > 0 else 0,
            'top_articles': [
                {
                    'id': str(item['article'].id),
                    'title': item['article'].title,
                    'slug': item['article'].slug,
                    'views': item['views'],
                    'unique_views': item['article'].get_unique_views(),
                    'engagement_rate': item['article'].get_engagement_rate()
                }
                for item in top_articles
            ]
        })
