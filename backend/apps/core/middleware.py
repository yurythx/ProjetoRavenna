from django.http import JsonResponse
from apps.core.models import AppModule

class ModuleMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path
        # Expected format: /api/v1/<module>/...
        if path.startswith('/api/v1/'):
            parts = path.strip('/').split('/')
            # parts example: ['api', 'v1', 'articles', 'create']
            if len(parts) >= 3:
                module_slug = parts[2]
                
                # Skip auth and core modules checks if necessary, or ensure they are present in DB
                # Skip auth and core modules checks if necessary
                if module_slug == 'auth':
                    return self.get_response(request)

                from django.core.cache import cache
                
                cache_key = f"module_active_{module_slug}"
                is_active = cache.get(cache_key)

                if is_active is None:
                    # Not in cache, check DB
                    try:
                        module = AppModule.objects.filter(slug=module_slug).first()
                        if module:
                             is_active = module.is_active
                        else:
                             # Module doesn't exist in DB - treat as active or ignore? 
                             # Based on instructions, we mainly care if it exists and is disabled.
                             # If it doesn't exist, we assume True (pass through) or False?
                             # Previous code only blocked if (module and not module.is_active).
                             # So if module is None, we default to True (safe).
                             is_active = True
                        
                        # Cache for 5 minutes
                        cache.set(cache_key, is_active, 300)
                    except Exception:
                        is_active = True
                
                # If explicitly disabled
                if is_active is False:
                     return JsonResponse({
                         'code': 'module_disabled', 
                         'message': f'The module {module_slug} is currently disabled.',
                         'details': {}
                     }, status=403)

        return self.get_response(request)
