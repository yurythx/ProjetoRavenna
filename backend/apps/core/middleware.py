from django.http import JsonResponse
from apps.core.models import AppModule
from apps.core.tenant_context import set_current_tenant_id, clear_current_tenant_id

class TenantMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        host = request.get_host().split(':')[0]
        
        # Clean host
        clean_host = host
        if host.startswith('api.'):
            clean_host = host[4:]
        elif host.startswith('www.'):
            clean_host = host[4:]

        from django.core.cache import cache
        from apps.entities.models import Entity
        
        # We reuse the logic from EntityConfigView for now
        # Cache key for tenant id
        cache_key = f'tenant_id_{clean_host}'
        tenant_id = cache.get(cache_key)
        
        if tenant_id is None:
            entity = Entity.objects.filter(domain=clean_host, is_active=True).first()
            
            # Fallback for development
            if not entity and (host in ['localhost', '127.0.0.1', 'backend']):
                entity = Entity.objects.filter(is_active=True).first()
            
            if entity:
                tenant_id = str(entity.id)
                cache.set(cache_key, tenant_id, 3600) # Cache for 1 hour
            else:
                tenant_id = "MISSING" # Mark as missing in cache to avoid DB hits
                cache.set(cache_key, tenant_id, 300)

        if tenant_id and tenant_id != "MISSING":
            token = set_current_tenant_id(tenant_id)
            request.tenant_id = tenant_id
            
            # RBAC: Check user membership if authenticated
            if request.user.is_authenticated:
                # We don't block yet, just identify the role
                if request.user.is_superuser:
                    request.tenant_role = 'OWNER'
                else:
                    from apps.accounts.models import TenantMembership
                    member = TenantMembership.objects.filter(
                        user=request.user, 
                        tenant_id=tenant_id
                    ).first()
                    request.tenant_role = member.role if member else None
            else:
                request.tenant_role = None
        else:
            token = None
            request.tenant_id = None
            request.tenant_role = None

        try:
            response = self.get_response(request)
        finally:
            if token:
                clear_current_tenant_id(token)

        return response

class ModuleMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path
        if path.startswith('/api/v1/'):
            parts = path.strip('/').split('/')
            if len(parts) >= 3:
                module_slug = parts[2]
                
                if module_slug in ['auth', 'entities', 'accounts']:
                    return self.get_response(request)

                from django.core.cache import cache
                tenant_id = getattr(request, 'tenant_id', None)
                
                cache_key = f"module_active_{tenant_id}_{module_slug}" if tenant_id else f"module_active_global_{module_slug}"
                is_active = cache.get(cache_key)

                if is_active is None:
                    try:
                        from apps.core.models import AppModule, TenantModule
                        module = AppModule.objects.filter(slug=module_slug).first()
                        
                        if module:
                            if module.is_system_module:
                                is_active = module.is_active
                            elif tenant_id:
                                # Check tenant specific overrides
                                tm = TenantModule.objects.filter(tenant_id=tenant_id, module=module).first()
                                is_active = tm.is_active if tm else module.is_active
                            else:
                                is_active = module.is_active
                        else:
                            is_active = True
                        
                        cache.set(cache_key, is_active, 300)
                    except Exception:
                        is_active = True
                
                if is_active is False:
                     return JsonResponse({
                         'code': 'module_disabled', 
                         'message': f'The module {module_slug} is currently disabled for this tenant.',
                         'details': {}
                     }, status=403)

        return self.get_response(request)
