import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.entities.models import Entity
from apps.articles.models import Article, Category
from apps.core.tenant_context import set_current_tenant_id, clear_current_tenant_id

def verify_isolation():
    # 1. Ensure we have at least two entities with UNIQUE domains and names
    # We use explicit domain to avoid collisions
    e1, _ = Entity.objects.update_or_create(
        domain='test-tenant1.local', 
        defaults={'brand_name': 'Test Unique Tenant 1', 'slug': 'test-tenant-1'}
    )
    e2, _ = Entity.objects.update_or_create(
        domain='test-tenant2.local', 
        defaults={'brand_name': 'Test Unique Tenant 2', 'slug': 'test-tenant-2'}
    )
    
    print(f"Verified Entities: {e1.domain}, {e2.domain}")

    # 2. Add categories for each tenant
    c1, _ = Category.objects.update_or_create(name='General T1', tenant=e1)
    c2, _ = Category.objects.update_or_create(name='General T2', tenant=e2)

    # 3. Create articles for each tenant
    a1, _ = Article.objects.update_or_create(title='Article T1', tenant=e1, defaults={'content': 'Content T1', 'category': c1})
    a2, _ = Article.objects.update_or_create(title='Article T2', tenant=e2, defaults={'content': 'Content T2', 'category': c2})

    print("Test data ready.")

    # 4. Test isolation for Tenant 1
    token = set_current_tenant_id(str(e1.id))
    try:
        t1_articles = Article.objects.all()
        print(f"Tenant 1 sees {t1_articles.count()} articles: {[a.title for a in t1_articles]}")
        # Note: If there were other articles in DB, they might be visible if they have no tenant
        # But for test-tenant1.id specifically, it should only see its own.
        for a in t1_articles:
            if a.tenant_id != e1.id:
                 print(f"FAILURE: Article {a.title} from tenant {a.tenant_id} visible to tenant {e1.id}")
                 exit(1)
        print("PASS: Tenant 1 isolation verified.")
    finally:
        clear_current_tenant_id(token)

    # 5. Test isolation for Tenant 2
    token = set_current_tenant_id(str(e2.id))
    try:
        t2_articles = Article.objects.all()
        print(f"Tenant 2 sees {t2_articles.count()} articles: {[a.title for a in t2_articles]}")
        for a in t2_articles:
            if a.tenant_id != e2.id:
                 print(f"FAILURE: Article {a.title} from tenant {a.tenant_id} visible to tenant {e2.id}")
                 exit(1)
        print("PASS: Tenant 2 isolation verified.")
    finally:
        clear_current_tenant_id(token)

    print("\n--- ALL ISOLATION TESTS PASSED ---")

if __name__ == "__main__":
    verify_isolation()
