from django.contrib import admin
from django.utils.html import format_html
from .models import AppModule


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
