import os
import django
from django.test import RequestFactory
from django.core.cache import cache

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.entities.models import Entity
from apps.core.models import AppModule, TenantModule, Notification
from apps.accounts.models import CustomUser
from apps.core.middleware import ModuleMiddleware, TenantMiddleware

def verify_module_isolation():
    cache.clear()

    # 1. Setup
    e1, _ = Entity.objects.update_or_create(domain='mod-t1.local', defaults={'brand_name': 'Mod Tenant 1', 'slug': 'mod-t1'})
    e2, _ = Entity.objects.update_or_create(domain='mod-t2.local', defaults={'brand_name': 'Mod Tenant 2', 'slug': 'mod-t2'})
    
    # Ensure Article module exists and is NOT a system module for this test
    # (Because system modules bypass tenant-specific checks)
    articles_mod, _ = AppModule.objects.update_or_create(
        slug='articles', 
        defaults={'name': 'Articles', 'display_name': 'Artigos', 'is_active': True, 'is_system_module': False}
    )
    # Explicitly ensure it's NOT a system module if it already existed
    if articles_mod.is_system_module:
        articles_mod.is_system_module = False
        articles_mod.save()
    
    # 2. Disable Articles for Tenant 1 specifically
    TenantModule.objects.update_or_create(tenant=e1, module=articles_mod, defaults={'is_active': False})
    # Enable for Tenant 2 specifically
    TenantModule.objects.update_or_create(tenant=e2, module=articles_mod, defaults={'is_active': True})

    factory = RequestFactory()
    t_middleware = TenantMiddleware(lambda r: r)
    m_middleware = ModuleMiddleware(lambda r: r)

    # 3. Test Tenant 1 (Disabled)
    request1 = factory.get('/api/v1/articles/posts/', HTTP_HOST='mod-t1.local')
    from django.contrib.auth.models import AnonymousUser
    request1.user = AnonymousUser()
    t_middleware(request1)
    
    response1 = m_middleware(request1)
    
    from django.http import JsonResponse
    if not isinstance(response1, JsonResponse):
        print(f"FAILURE: Tenant 1 should have blocked access. Got type: {type(response1)}")
        exit(1)
    
    print(f"Tenant 1 (Articles Disabled) status: {response1.status_code}")
    assert response1.status_code == 403

    # 4. Test Tenant 2 (Enabled)
    # Clear cache before next check to be sure
    cache.clear()
    request2 = factory.get('/api/v1/articles/posts/', HTTP_HOST='mod-t2.local')
    request2.user = AnonymousUser()
    t_middleware(request2)
    response2 = m_middleware(request2)
    print(f"Tenant 2 (Articles Enabled) result type: {type(response2)}")
    assert not isinstance(response2, JsonResponse)

    print("\n--- ALL MODULE ISOLATION TESTS PASSED ---")

if __name__ == "__main__":
    from django.conf import settings
    settings.ALLOWED_HOSTS = ['*']
    verify_module_isolation()
