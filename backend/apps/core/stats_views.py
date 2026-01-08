from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.utils import timezone
from django.db.models import Count, Avg, Sum
from datetime import timedelta
from apps.accounts.models import CustomUser
from apps.articles.models import Article, Comment
from apps.articles.analytics_models import ArticleView


def get_chart_data(model, start_date, date_field='created_at'):
    """Aggregate data by day for charts"""
    queryset = model.objects.filter(**{f'{date_field}__gte': start_date})
    date_counts = {}
    
    for obj in queryset:
        date_value = getattr(obj, date_field)
        date_str = date_value.date().isoformat()
        date_counts[date_str] = date_counts.get(date_str, 0) + 1
    
    return [{'date': date, 'count': count} for date, count in sorted(date_counts.items())]


class DashboardStatsView(APIView):
    """
    API endpoint for premium dashboard statistics
    """
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        thirty_days_ago = timezone.now() - timedelta(days=30)
        
        # 1. KPIs Globais
        total_users = CustomUser.objects.count()
        total_articles = Article.objects.count()
        total_comments = Comment.objects.count()
        published_articles = Article.objects.filter(is_published=True).count()
        
        # 2. Métricas de Engajamento (Opcional para o frontend atual, mas mantido para consistência)
        # Unique views and reading time are not explicitly in the current frontend interface but good for future use
        total_views = ArticleView.objects.count()
        unique_views = ArticleView.objects.values('session_id').distinct().count()
        
        all_articles = Article.objects.all()
        if all_articles.exists():
            avg_reading_time = sum(a.calculate_reading_time() for a in all_articles) / all_articles.count()
        else:
            avg_reading_time = 0.0
        
        # 3. Crescimento (Últimos 30 dias)
        new_articles = Article.objects.filter(created_at__gte=thirty_days_ago).count()
        new_users = CustomUser.objects.filter(date_joined__gte=thirty_days_ago).count()
        new_comments = Comment.objects.filter(created_at__gte=thirty_days_ago).count()
        new_views = ArticleView.objects.filter(created_at__gte=thirty_days_ago).count()
        
        # 4. Dados para Gráficos
        views_by_day = get_chart_data(ArticleView, thirty_days_ago)
        articles_by_day = get_chart_data(Article, thirty_days_ago)
        users_by_day = get_chart_data(CustomUser, thirty_days_ago, date_field='date_joined')
        comments_by_day = get_chart_data(Comment, thirty_days_ago)
        
        # 5. Top Conteúdo e Autores
        # Top articles (Top Conteúdo)
        top_articles = Article.objects.filter(is_published=True).annotate(
            actual_view_count=Count('views')
        ).order_by('-actual_view_count')[:5]
        
        top_articles_data = [{
            'id': a.id,
            'title': a.title,
            'slug': a.slug,
            'views': a.get_view_count(),
            'engagement': a.get_engagement_rate()
        } for a in top_articles]
        
        # Top Authors (Requerido pelo frontend)
        top_authors = Article.objects.values(
            'author__email', 'author__first_name', 'author__last_name'
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
                # Additional metrics
                'total_views': total_views,
                'unique_views': unique_views,
                'avg_reading_time': round(float(avg_reading_time), 1),
                'new_views_30d': new_views,
            },
            'charts': {
                'views_by_day': views_by_day,
                'articles_by_day': articles_by_day,
                'users_by_day': users_by_day,
                'comments_by_day': comments_by_day,
            },
            'top_articles': top_articles_data,
            'top_authors': list(top_authors),
        })
