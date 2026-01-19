import os
import django
from django.test import RequestFactory

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.conf import settings
settings.ALLOWED_HOSTS = ['*']

from django.contrib.auth.models import AnonymousUser
from apps.entities.models import Entity
from apps.accounts.models import CustomUser, TenantMembership
from apps.core.middleware import TenantMiddleware

def verify_rbac():
    # 1. Setup Test Data
    e1, _ = Entity.objects.get_or_create(domain='rbac-tenant1.local', defaults={'brand_name': 'RBAC Tenant 1', 'slug': 'rbac-t1'})
    e2, _ = Entity.objects.get_or_create(domain='rbac-tenant2.local', defaults={'brand_name': 'RBAC Tenant 2', 'slug': 'rbac-t2'})
    
    u1, _ = CustomUser.objects.get_or_create(email='user1@t1.local', defaults={'username': 'user1t1'})
    u2, _ = CustomUser.objects.get_or_create(email='user2@t2.local', defaults={'username': 'user2t2'})

    # Membership
    TenantMembership.objects.update_or_create(user=u1, tenant=e1, defaults={'role': 'OWNER'})
    TenantMembership.objects.update_or_create(user=u2, tenant=e2, defaults={'role': 'MEMBER'})

    print(f"Entities and Users created.")

    factory = RequestFactory()
    middleware = TenantMiddleware(lambda r: r)

    # 2. Test User 1 on Tenant 1
    request = factory.get('/', HTTP_HOST='rbac-tenant1.local')
    request.user = u1
    middleware(request)
    print(f"User 1 on Tenant 1 Host: Role={request.tenant_role}")
    assert request.tenant_role == 'OWNER'

    # 3. Test User 1 on Tenant 2
    request = factory.get('/', HTTP_HOST='rbac-tenant2.local')
    request.user = u1
    middleware(request)
    print(f"User 1 on Tenant 2 Host: Role={request.tenant_role}")
    assert request.tenant_role is None

    # 4. Test User 2 on Tenant 2
    request = factory.get('/', HTTP_HOST='rbac-tenant2.local')
    request.user = u2
    middleware(request)
    print(f"User 2 on Tenant 2 Host: Role={request.tenant_role}")
    assert request.tenant_role == 'MEMBER'

    print("\n--- ALL RBAC TESTS PASSED ---")

if __name__ == "__main__":
    verify_rbac()
