from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Count
from apps.core.tenant_context import get_current_tenant_id
from .models import Category, Tag, Article, Comment

from .like_models import ArticleLike, ArticleFavorite
from .analytics_models import ArticleView, ReadingSession

class BaseTenantAdmin(admin.ModelAdmin):
    def save_model(self, request, obj, form, change):
        if not change and not getattr(obj, 'tenant_id', None):
            obj.tenant_id = get_current_tenant_id()
        super().save_model(request, obj, form, change)

@admin.register(Category)
class CategoryAdmin(BaseTenantAdmin):
    list_display = ('name', 'slug', 'article_count', 'created_at', 'updated_at')
    list_filter = ('created_at', 'updated_at')
    search_fields = ('name', 'description', 'slug')
    readonly_fields = ('id', 'slug', 'tenant', 'created_at', 'updated_at')
    ordering = ('name',)
    
    fieldsets = (
        ('Category Information', {
            'fields': ('name', 'slug', 'description')
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    list_per_page = 25
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        queryset = queryset.annotate(_article_count=Count('articles', distinct=True))
        return queryset
    
    def article_count(self, obj):
        return obj._article_count
    article_count.short_description = 'Articles'
    article_count.admin_order_field = '_article_count'

@admin.register(Tag)
class TagAdmin(BaseTenantAdmin):
    list_display = ('name', 'color_preview', 'slug', 'article_count', 'created_at', 'updated_at')
    list_filter = ('created_at', 'updated_at')
    search_fields = ('name', 'slug', 'description')
    readonly_fields = ('id', 'slug', 'tenant', 'created_at', 'updated_at')
    ordering = ('name',)
    
    fieldsets = (
        ('Tag Information', {
            'fields': ('name', 'slug', 'description', 'color')
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    list_per_page = 25
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        queryset = queryset.annotate(_article_count=Count('articles', distinct=True))
        return queryset
    
    def article_count(self, obj):
        return obj._article_count
    article_count.short_description = 'Articles'
    article_count.admin_order_field = '_article_count'
    
    def color_preview(self, obj):
        return format_html(
            '<span style="background-color: {}; padding: 4px 12px; border-radius: 4px; color: white; font-weight: bold;">{}</span>',
            obj.color, obj.color
        )
    color_preview.short_description = 'Color'

@admin.register(Article)
class ArticleAdmin(BaseTenantAdmin):
    list_display = ('title', 'author', 'category', 'is_published', 'banner_preview', 'tag_list', 'created_at', 'tenant')
    list_filter = ('is_published', 'category', 'tags', 'created_at', 'updated_at', 'author', 'tenant')
    search_fields = ('title', 'content', 'slug', 'author__email', 'author__username')
    readonly_fields = ('id', 'slug', 'tenant', 'created_at', 'updated_at', 'banner_preview')
    autocomplete_fields = ['category', 'tags', 'author']
    
    ordering = ('-created_at',)
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Article Content', {
            'fields': ('title', 'slug', 'content', 'category', 'tags', 'author')
        }),
        ('Media', {
            'fields': ('banner', 'banner_preview'),
        }),
        ('Publication', {
            'fields': ('is_published',)
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at', 'tenant'),
            'classes': ('collapse',)
        }),
    )
    
    list_per_page = 25
    actions = ['publish_articles', 'unpublish_articles']
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        queryset = queryset.select_related('author', 'category').prefetch_related('tags')
        return queryset
    
    def banner_preview(self, obj):
        if obj.banner:
            return format_html('<img src="{}" width="200" height="auto" style="border-radius: 8px;" />', obj.banner.url)
        return "No banner"
    banner_preview.short_description = 'Banner Preview'
    
    def tag_list(self, obj):
        return ", ".join([tag.name for tag in obj.tags.all()])
    tag_list.short_description = 'Tags'
    
    def publish_articles(self, request, queryset):
        updated = queryset.update(is_published=True)
        self.message_user(request, f'{updated} article(s) were successfully published.')
    publish_articles.short_description = "Publish selected articles"
    
    def unpublish_articles(self, request, queryset):
        updated = queryset.update(is_published=False)
        self.message_user(request, f'{updated} article(s) were successfully unpublished.')
    unpublish_articles.short_description = "Unpublish selected articles"

@admin.register(Comment)
class CommentAdmin(BaseTenantAdmin):
    list_display = ('short_content', 'author_or_guest', 'article', 'parent', 'is_approved', 'created_at', 'tenant')
    list_filter = ('is_approved', 'created_at', 'tenant')
    search_fields = ('content', 'author__email', 'author__username', 'article__title', 'guest_email', 'guest_name')
    readonly_fields = ('id', 'tenant', 'created_at', 'updated_at')
    autocomplete_fields = ['author', 'article', 'parent']
    
    ordering = ('-created_at',)
    fieldsets = (
        ('Comment Content', {
            'fields': ('article', 'author', 'parent', 'content')
        }),
        ('Moderation', {
            'fields': ('is_approved',)
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at', 'tenant'),
            'classes': ('collapse',)
        }),
    )
    
    def short_content(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    
    def author_or_guest(self, obj):
        if obj.author: return obj.author.email
        return obj.guest_email or obj.guest_name or 'Visitante'

@admin.register(ArticleLike)
class ArticleLikeAdmin(BaseTenantAdmin):
    list_display = ('user', 'article', 'created_at', 'tenant')
    list_filter = ('created_at', 'tenant')
    readonly_fields = ('id', 'created_at', 'updated_at', 'tenant')

@admin.register(ArticleFavorite)
class ArticleFavoriteAdmin(BaseTenantAdmin):
    list_display = ('user', 'article', 'created_at', 'tenant')
    list_filter = ('created_at', 'tenant')
    readonly_fields = ('id', 'created_at', 'updated_at', 'tenant')

@admin.register(ArticleView)
class ArticleViewAdmin(BaseTenantAdmin):
    list_display = ('article', 'user', 'session_id', 'reading_progress', 'time_spent', 'created_at', 'tenant')
    list_filter = ('created_at', 'tenant')
    readonly_fields = ('id', 'created_at', 'updated_at', 'tenant')

@admin.register(ReadingSession)
class ReadingSessionAdmin(BaseTenantAdmin):
    list_display = ('article_view', 'duration_seconds', 'scrolled_to_bottom', 'started_at', 'tenant')
    list_filter = ('started_at', 'tenant')
    readonly_fields = ('id', 'tenant')
