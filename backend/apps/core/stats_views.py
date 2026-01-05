from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Count
from datetime import timedelta
from apps.accounts.models import CustomUser
from apps.articles.models import Article, Comment


def get_chart_data(model, start_date, date_field='created_at'):
    """
    Aggregate data by day for charts
    
    Args:
        model: Django model class
        start_date: Start date for filtering
        date_field: Field name for date filtering (default: 'created_at')
    
    Returns:
        List of dicts with 'date' and 'count' keys
    """
    # Using Django ORM to group by date
    queryset = model.objects.filter(**{f'{date_field}__gte': start_date})
    
    # Create a dict to store counts by date
    date_counts = {}
    
    for obj in queryset:
        date_value = getattr(obj, date_field)
        date_str = date_value.date().isoformat()
        date_counts[date_str] = date_counts.get(date_str, 0) + 1
    
    # Convert to list and sort by date
    result = [{'date': date, 'count': count} for date, count in sorted(date_counts.items())]
    
    return result


class DashboardStatsView(APIView):
    """
    API endpoint for dashboard statistics
    
    Returns:
        - KPIs: total counts and new items in last 30 days
        - Charts: daily data for the last 30 days
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Calculate 30 days ago
        thirty_days_ago = timezone.now() - timedelta(days=30)
        
        # Total KPIs
        total_users = CustomUser.objects.count()
        total_articles = Article.objects.count()
        total_comments = Comment.objects.count()
        published_articles = Article.objects.filter(is_published=True).count()
        
        # New items in last 30 days
        new_users = CustomUser.objects.filter(date_joined__gte=thirty_days_ago).count()
        new_articles = Article.objects.filter(created_at__gte=thirty_days_ago).count()
        new_comments = Comment.objects.filter(created_at__gte=thirty_days_ago).count()
        
        # Chart data (by day, last 30 days)
        articles_by_day = get_chart_data(Article, thirty_days_ago)
        users_by_day = get_chart_data(CustomUser, thirty_days_ago, date_field='date_joined')
        comments_by_day = get_chart_data(Comment, thirty_days_ago)
        
        # Top authors (most articles)
        top_authors = Article.objects.values(
            'author__email', 
            'author__first_name', 
            'author__last_name'
        ).annotate(
            article_count=Count('id')
        ).order_by('-article_count')[:5]
        
        return Response({
            'kpis': {
                'total_users': total_users,
                'total_articles': total_articles,
                'total_comments': total_comments,
                'published_articles': published_articles,
                'new_users_30d': new_users,
                'new_articles_30d': new_articles,
                'new_comments_30d': new_comments,
            },
            'charts': {
                'articles_by_day': articles_by_day,
                'users_by_day': users_by_day,
                'comments_by_day': comments_by_day,
            },
            'top_authors': list(top_authors),
        })
