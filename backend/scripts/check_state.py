import os
import django
import sys

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.entities.models import Entity
from apps.core.models import AppModule, TenantModule
from apps.accounts.models import CustomUser

def check_state():
    print("--- DATABASE STATE CHECK ---")
    
    # 1. Entities (Tenants)
    entities = Entity.objects.all()
    print(f"\nEntities found: {entities.count()}")
    for e in entities:
        print(f" - {e.name} (ID: {e.id}, Domain: {e.domain})")
    
    # Check specifically for localhost
    if not Entity.objects.filter(domain='localhost').exists():
        print("\nWARNING: No entity found for 'localhost'. Frontend might 404.")
    
    # 2. Users
    users = CustomUser.objects.all()
    print(f"\nUsers found: {users.count()}")
    for u in users:
        print(f" - {u.username} (Email: {u.email}, Role: {u.role}, IsSuper: {u.is_superuser})")
    
    # 3. Modules
    modules = AppModule.objects.all()
    print(f"\nAppModules found: {modules.count()}")
    for m in modules:
        print(f" - {m.name} ({m.display_name}, Active: {m.is_active})")
        
    # 4. Tenant Modules
    tenant_mods = TenantModule.objects.all()
    print(f"\nTenantModules assigned: {tenant_mods.count()}")
    for tm in tenant_mods:
        print(f" - Tenant: {tm.tenant.name}, Module: {tm.module.name}, Active: {tm.is_active}")

if __name__ == "__main__":
    check_state()
