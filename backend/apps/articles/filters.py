import django_filters
from .models import Article

class ArticleFilter(django_filters.FilterSet):
    category = django_filters.CharFilter(field_name='category__slug')
    tags = django_filters.CharFilter(field_name='tags__slug', method='filter_by_tags')
    # search and ordering are handled by SearchFilter and OrderingFilter backends, 
    # but we can also add explicit filters here if needed. 
    # For now, following the script to primarily handle relations filtering here.

    class Meta:
        model = Article
        fields = ['category', 'tags', 'is_published']

    def filter_by_tags(self, queryset, name, value):
        # Allow filtering by multiple tags comma separated
        tag_list = value.split(',')
        return queryset.filter(tags__slug__in=tag_list).distinct()
