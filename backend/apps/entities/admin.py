from django.contrib import admin
from django.contrib.contenttypes.admin import GenericTabularInline
from .models import Entity, Address


class AddressInline(GenericTabularInline):
    """
    Inline admin for Address model.
    Allows adding/editing addresses directly in the related model's admin page.
    """
    model = Address
    extra = 1
    fields = ('label', 'street', 'number', 'complement', 'district', 'city', 'state', 'zip_code')
    verbose_name = "Address"
    verbose_name_plural = "Addresses"


@admin.register(Entity)
class EntityAdmin(admin.ModelAdmin):
    """
    Admin configuration for Entity model.
    """
    list_display = ('name', 'domain', 'brand_name', 'entity_type', 'is_active', 'created_at')
    list_filter = ('entity_type', 'is_active', 'created_at', 'updated_at')
    search_fields = ('name', 'domain', 'brand_name', 'tax_id', 'slug')
    readonly_fields = ('id', 'slug', 'created_at', 'updated_at')
    ordering = ('name',)
    list_editable = ('is_active',)
    
    fieldsets = (
        ('Entity Information', {
            'fields': ('name', 'slug', 'entity_type', 'tax_id')
        }),
        ('White-Label Configuration', {
            'fields': ('domain', 'brand_name', 'primary_color', 'secondary_color', 'logo', 'favicon', 'footer_text', 'is_active'),
            'description': 'Configure branding and domain for this tenant'
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    # Pagination
    list_per_page = 25
    
    # Inline addresses
    inlines = [AddressInline]
    
    # Radio buttons for entity_type instead of dropdown
    radio_fields = {'entity_type': admin.HORIZONTAL}
    
    # Actions
    actions = ['convert_to_pf', 'convert_to_pj']
    
    def convert_to_pf(self, request, queryset):
        """Convert selected entities to Pessoa Física"""
        updated = queryset.update(entity_type='PF')
        self.message_user(request, f'{updated} entity(ies) were converted to Pessoa Física.')
    convert_to_pf.short_description = "Convert to Pessoa Física"
    
    def convert_to_pj(self, request, queryset):
        """Convert selected entities to Pessoa Jurídica"""
        updated = queryset.update(entity_type='PJ')
        self.message_user(request, f'{updated} entity(ies) were converted to Pessoa Jurídica.')
    convert_to_pj.short_description = "Convert to Pessoa Jurídica"


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    """
    Admin configuration for Address model.
    """
    list_display = ('label', 'street', 'number', 'city', 'state', 'zip_code', 'content_type', 'created_at')
    list_filter = ('content_type', 'state', 'city', 'created_at', 'updated_at')
    search_fields = ('label', 'street', 'city', 'state', 'zip_code', 'district')
    readonly_fields = ('id', 'created_at', 'updated_at', 'content_type', 'object_id')
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Address Information', {
            'fields': ('label', 'street', 'number', 'complement', 'district', 'city', 'state', 'zip_code')
        }),
        ('Related Object', {
            'fields': ('content_type', 'object_id'),
            'classes': ('collapse',),
            'description': 'This address is linked to the following object'
        }),
        ('Metadata', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    # Pagination
    list_per_page = 25
    
    def has_add_permission(self, request):
        """
        Disable direct creation of addresses.
        Addresses should be created through their related objects (using GenericInline).
        """
        return False
