from django.contrib import admin
from django.utils.html import format_html
from .models import AppModule, Notification


@admin.register(AppModule)
class AppModuleAdmin(admin.ModelAdmin):
    """
    Admin configuration for AppModule model.
    Manages the system modules with their configurations.
    """
    list_display = ('display_name', 'name', 'slug', 'is_active', 'is_system_module', 'status_indicator', 'created_at', 'updated_at')
    list_filter = ('is_active', 'is_system_module', 'created_at', 'updated_at')
    search_fields = ('name', 'display_name', 'slug')
    readonly_fields = ('id', 'slug', 'created_at', 'updated_at')
    ordering = ('display_name',)
    
    fieldsets = (
        ('Module Information', {
            'fields': ('name', 'slug', 'display_name')
        }),
        ('Module Status', {
            'fields': ('is_active', 'is_system_module')
        }),
        ('Configuration', {
            'fields': ('config_json',),
            'classes': ('collapse',),
            'description': 'JSON configuration for this module. Use valid JSON format.'
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    # Pagination
    list_per_page = 25
    
    # Actions
    actions = ['activate_modules', 'deactivate_modules', 'mark_as_system', 'unmark_as_system']
    
    def status_indicator(self, obj):
        """Display colored status indicator"""
        if obj.is_active:
            color = 'green'
            status = '● Active'
        else:
            color = 'red'
            status = '● Inactive'
        
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            status
        )
    status_indicator.short_description = 'Status'
    
    def activate_modules(self, request, queryset):
        """Activate selected modules"""
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated} module(s) were successfully activated.')
    activate_modules.short_description = "Activate selected modules"
    
    def deactivate_modules(self, request, queryset):
        """Deactivate selected modules"""
        # Prevent deactivation of system modules
        system_modules = queryset.filter(is_system_module=True)
        if system_modules.exists():
            self.message_user(
                request, 
                f'Cannot deactivate system modules: {", ".join(system_modules.values_list("name", flat=True))}',
                level='error'
            )
            queryset = queryset.filter(is_system_module=False)
        
        updated = queryset.update(is_active=False)
        if updated:
            self.message_user(request, f'{updated} module(s) were successfully deactivated.')
    deactivate_modules.short_description = "Deactivate selected modules"
    
    def mark_as_system(self, request, queryset):
        """Mark selected modules as system modules"""
        updated = queryset.update(is_system_module=True)
        self.message_user(request, f'{updated} module(s) were marked as system modules.')
    mark_as_system.short_description = "Mark as system module"
    
    def unmark_as_system(self, request, queryset):
        """Unmark selected modules as system modules"""
        updated = queryset.update(is_system_module=False)
        self.message_user(request, f'{updated} module(s) were unmarked as system modules.')
    unmark_as_system.short_description = "Unmark as system module"
    
    def get_readonly_fields(self, request, obj=None):
        """Make system modules' critical fields readonly when editing"""
        readonly = list(super().get_readonly_fields(request, obj))
        if obj and obj.is_system_module:
            readonly.extend(['name', 'is_system_module'])
        return readonly


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """
    Admin configuration for Notification model.
    Manages user notifications for various system events.
    """
    list_display = ('title', 'recipient', 'sender', 'notification_type', 'is_read', 'read_status_indicator', 'created_at')
    list_filter = ('notification_type', 'is_read', 'created_at')
    search_fields = ('title', 'message', 'recipient__username', 'recipient__email', 'sender__username', 'sender__email')
    readonly_fields = ('id', 'created_at', 'updated_at')
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Notification Information', {
            'fields': ('recipient', 'sender', 'notification_type', 'title', 'message')
        }),
        ('Link', {
            'fields': ('link',),
        }),
        ('Status', {
            'fields': ('is_read',)
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    list_per_page = 50
    actions = ['mark_as_read', 'mark_as_unread']
    
    def read_status_indicator(self, obj):
        """Display colored read status indicator"""
        if obj.is_read:
            color = 'gray'
            status = '● Lida'
        else:
            color = 'green'
            status = '● Não lida'
        
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            status
        )
    read_status_indicator.short_description = 'Status de Leitura'
    
    def mark_as_read(self, request, queryset):
        """Mark selected notifications as read"""
        updated = queryset.update(is_read=True)
        self.message_user(request, f'{updated} notificação(ões) marcada(s) como lida(s).')
    mark_as_read.short_description = "Marcar como lida"
    
    def mark_as_unread(self, request, queryset):
        """Mark selected notifications as unread"""
        updated = queryset.update(is_read=False)
        self.message_user(request, f'{updated} notificação(ões) marcada(s) como não lida(s).')
    mark_as_unread.short_description = "Marcar como não lida"
