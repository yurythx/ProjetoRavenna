from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Count
from .models import Category, Tag, Article, Comment


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    """
    Admin configuration for Category model.
    """
    list_display = ('name', 'slug', 'article_count', 'created_at', 'updated_at')
    list_filter = ('created_at', 'updated_at')
    search_fields = ('name', 'description', 'slug')
    readonly_fields = ('id', 'slug', 'created_at', 'updated_at')
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
    
    # Pagination
    list_per_page = 25
    
    def get_queryset(self, request):
        """Optimize queryset with article count"""
        queryset = super().get_queryset(request)
        queryset = queryset.annotate(
            _article_count=Count('articles', distinct=True)
        )
        return queryset
    
    def article_count(self, obj):
        """Display the number of articles in this category"""
        return obj._article_count
    article_count.short_description = 'Articles'
    article_count.admin_order_field = '_article_count'


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    """
    Admin configuration for Tag model.
    """
    list_display = ('name', 'color_preview', 'slug', 'article_count', 'created_at', 'updated_at')
    list_filter = ('created_at', 'updated_at')
    search_fields = ('name', 'slug', 'description')
    readonly_fields = ('id', 'slug', 'created_at', 'updated_at')
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
    
    # Pagination
    list_per_page = 25
    
    def get_queryset(self, request):
        """Optimize queryset with article count"""
        queryset = super().get_queryset(request)
        queryset = queryset.annotate(
            _article_count=Count('articles', distinct=True)
        )
        return queryset
    
    def article_count(self, obj):
        """Display the number of articles with this tag"""
        return obj._article_count
    article_count.short_description = 'Articles'
    article_count.admin_order_field = '_article_count'
    
    def color_preview(self, obj):
        """Display color preview badge"""
        return format_html(
            '<span style="background-color: {}; padding: 4px 12px; border-radius: 4px; color: white; font-weight: bold;">{}</span>',
            obj.color,
            obj.color
        )
    color_preview.short_description = 'Color'


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    """
    Admin configuration for Article model.
    """
    list_display = ('title', 'author', 'category', 'is_published', 'banner_preview', 'tag_list', 'created_at', 'updated_at')
    list_filter = ('is_published', 'category', 'tags', 'created_at', 'updated_at', 'author')
    search_fields = ('title', 'content', 'slug', 'author__email', 'author__username')
    readonly_fields = ('id', 'slug', 'created_at', 'updated_at', 'banner_preview')
    autocomplete_fields = ['category', 'tags', 'author']
    
    # Prepopulate slug from title in add form
    prepopulated_fields = {}  # slug is auto-generated, but we keep this for clarity
    
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
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    # Filter configuration
    list_per_page = 25
    
    # Actions
    actions = ['publish_articles', 'unpublish_articles']
    
    def get_queryset(self, request):
        """Optimize queryset with select_related and prefetch_related"""
        queryset = super().get_queryset(request)
        queryset = queryset.select_related('author', 'category').prefetch_related('tags')
        return queryset
    
    def banner_preview(self, obj):
        """Display banner image preview"""
        if obj.banner:
            return format_html(
                '<img src="{}" width="200" height="auto" style="border-radius: 8px;" />',
                obj.banner.url
            )
        return "No banner"
    banner_preview.short_description = 'Banner Preview'
    
    def tag_list(self, obj):
        """Display list of tags"""
        return ", ".join([tag.name for tag in obj.tags.all()])
    tag_list.short_description = 'Tags'
    
    def publish_articles(self, request, queryset):
        """Publish selected articles"""
        updated = queryset.update(is_published=True)
        self.message_user(request, f'{updated} article(s) were successfully published.')
    publish_articles.short_description = "Publish selected articles"
    
    def unpublish_articles(self, request, queryset):
        """Unpublish selected articles"""
        updated = queryset.update(is_published=False)
        self.message_user(request, f'{updated} article(s) were successfully unpublished.')
    unpublish_articles.short_description = "Unpublish selected articles"


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    """
    Admin configuration for Comment model.
    """
    list_display = ('short_content', 'author_or_guest', 'article', 'parent', 'is_approved', 'created_at')
    list_filter = ('is_approved', 'created_at')
    search_fields = ('content', 'author__email', 'author__username', 'article__title', 'guest_email', 'guest_name', 'guest_phone')
    readonly_fields = ('id', 'created_at', 'updated_at')
    autocomplete_fields = ['author', 'article', 'parent']
    
    ordering = ('-created_at',)
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Comment Content', {
            'fields': ('article', 'author', 'parent', 'content')
        }),
        ('Moderation', {
            'fields': ('is_approved',)
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    list_per_page = 50
    actions = ['approve_comments', 'unapprove_comments']
    
    def short_content(self, obj):
        """Display truncated comment content"""
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    short_content.short_description = 'Content'
    
    def author_or_guest(self, obj):
        if obj.author:
            return obj.author.email
        return obj.guest_email or obj.guest_name or obj.guest_phone or 'Visitante'
    author_or_guest.short_description = 'Autor/Visitante'
    
    def approve_comments(self, request, queryset):
        updated = queryset.update(is_approved=True)
        self.message_user(request, f'{updated} comentário(s) aprovados.')
    approve_comments.short_description = 'Aprovar comentários selecionados'
    
    def unapprove_comments(self, request, queryset):
        updated = queryset.update(is_approved=False)
        self.message_user(request, f'{updated} comentário(s) desaprovados.')
    unapprove_comments.short_description = 'Desaprovar comentários selecionados'
    
    def approve_comments(self, request, queryset):
        """Approve selected comments"""
        updated = queryset.update(is_approved=True)
        self.message_user(request, f'{updated} comment(s) were approved.')
    approve_comments.short_description = "Approve selected comments"
    
    def unapprove_comments(self, request, queryset):
        """Unapprove selected comments"""
        updated = queryset.update(is_approved=False)
        self.message_user(request, f'{updated} comment(s) were unapproved.')
    unapprove_comments.short_description = "Unapprove selected comments"


# Enable autocomplete for Category
class CategoryAutocompleteAdmin(CategoryAdmin):
    search_fields = ['name', 'slug']


# Enable autocomplete for Tag
class TagAutocompleteAdmin(TagAdmin):
    search_fields = ['name', 'slug']
