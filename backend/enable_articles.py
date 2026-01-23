
import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.core.models import AppModule, TenantModule
from apps.entities.models import Entity

def enable_articles():
    # 1. Ensure AppModule 'articles' exists and is active
    module, created = AppModule.objects.get_or_create(
        slug='articles',
        defaults={
            'name': 'articles',
            'display_name': 'Artigos',
            'is_active': True,
            'is_system_module': False
        }
    )
    if not module.is_active:
        module.is_active = True
        module.save()
    print(f"Module '{module.slug}' is now {'active' if module.is_active else 'inactive'}.")

    # 2. Ensure TenantModule exists and is active for all entities (or just the first one)
    entities = Entity.objects.all()
    if not entities.exists():
        print("No entities found.")
        return

    for entity in entities:
        tm, created = TenantModule.objects.get_or_create(
            tenant=entity,
            module=module,
            defaults={'is_active': True}
        )
        if not tm.is_active:
            tm.is_active = True
            tm.save()
        print(f"Module '{module.slug}' enabled for tenant '{entity.brand_name}' (Active: {tm.is_active})")

if __name__ == "__main__":
    enable_articles()
