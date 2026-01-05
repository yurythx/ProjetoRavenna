from django.contrib import admin


class CustomAdminSite(admin.AdminSite):
    """
    Custom Django Admin Site with personalized branding
    """
    site_header = "Articles Platform Administration"
    site_title = "Articles Admin"
    index_title = "Welcome to Articles Platform Administration"
    site_url = None  # Remove "View site" link if not needed
    
    def each_context(self, request):
        """
        Add custom context to all admin pages
        """
        context = super().each_context(request)
        context['site_header'] = self.site_header
        context['site_title'] = self.site_title
        context['index_title'] = self.index_title
        return context


# Create custom admin site instance
admin_site = CustomAdminSite(name='customadmin')
