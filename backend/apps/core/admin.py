from django.contrib import admin
from django.utils.html import format_html
from .models import AppModule, Notification, TenantModule

@admin.register(AppModule)
class AppModuleAdmin(admin.ModelAdmin):
    list_display = ('display_name', 'name', 'slug', 'is_active', 'is_system_module', 'status_indicator', 'created_at')
    list_filter = ('is_active', 'is_system_module', 'created_at')
    search_fields = ('name', 'display_name', 'slug')
    readonly_fields = ('id', 'slug', 'created_at', 'updated_at')
    ordering = ('display_name',)
    
    def status_indicator(self, obj):
        color = 'green' if obj.is_active else 'red'
        status = '● Active' if obj.is_active else '● Inactive'
        return format_html('<span style="color: {}; font-weight: bold;">{}</span>', color, status)
    status_indicator.short_description = 'Status'

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('recipient', 'type', 'title', 'is_read', 'created_at', 'tenant')
    list_filter = ('type', 'is_read', 'created_at', 'tenant')
    search_fields = ('recipient__email', 'title', 'message')
    readonly_fields = ('id', 'created_at', 'updated_at')
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Notification Information', {
            'fields': ('recipient', 'type', 'title', 'message', 'tenant')
        }),
        ('Status', {
            'fields': ('is_read',)
        }),
        ('Target Object', {
            'fields': ('target_id', 'target_type'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(TenantModule)
class TenantModuleAdmin(admin.ModelAdmin):
    list_display = ('tenant', 'module', 'is_active', 'updated_at')
    list_filter = ('is_active', 'tenant', 'module')
    search_fields = ('tenant__brand_name', 'module__name')
    readonly_fields = ('id', 'created_at', 'updated_at')
