import os
import django
import io
from PIL import Image
from django.test import RequestFactory
from django.core.files.uploadedfile import SimpleUploadedFile

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.entities.models import Entity
from apps.articles.models import Article, Category, Comment, Tag
from apps.articles.like_models import ArticleLike
from apps.core.tenant_context import set_current_tenant_id, clear_current_tenant_id

def create_dummy_image():
    file_obj = io.BytesIO()
    image = Image.new('RGB', (100, 100), color=(73, 109, 137))
    image.save(file_obj, 'jpeg')
    file_obj.seek(0)
    return SimpleUploadedFile("test_image.jpg", file_obj.read(), content_type="image/jpeg")

def verify_comprehensive_isolation():
    # 1. Setup Tenants
    e1, _ = Entity.objects.get_or_create(domain='refine-t1.local', defaults={'brand_name': 'Refine Tenant 1', 'slug': 'refine-t1'})
    e2, _ = Entity.objects.get_or_create(domain='refine-t2.local', defaults={'brand_name': 'Refine Tenant 2', 'slug': 'refine-t2'})
    
    cat1, _ = Category.objects.get_or_create(tenant=e1, name='Cat T1', slug='cat-t1')
    
    # 2. Test Media Path Isolation
    # Create article for T1
    banner = create_dummy_image()
    a1 = Article.objects.create(
        tenant=e1,
        title='Article T1',
        content='Content T1',
        category=cat1,
        banner=banner
    )
    
    print(f"Article 1 Banner path: {a1.banner.name}")
    assert f"tenant_{e1.id}" in a1.banner.name
    print("PASS: Media isolation verified in path.")

    # 3. Test Interaction Isolation (Comments/Likes)
    from apps.accounts.models import CustomUser
    u1, _ = CustomUser.objects.get_or_create(email='user@t1.local', defaults={'username': 'usert1'})
    
    # Create comment and like for T1
    Comment.objects.create(tenant=e1, article=a1, content='Comment T1', is_approved=True)
    ArticleLike.objects.create(tenant=e1, article=a1, user=u1)

    # Verify visibility in T1 context
    token1 = set_current_tenant_id(str(e1.id))
    try:
        assert Comment.objects.count() >= 1
        assert ArticleLike.objects.count() >= 1
        print(f"Tenant 1 sees {Comment.objects.count()} comments and {ArticleLike.objects.count()} likes.")
    finally:
        clear_current_tenant_id(token1)

    # Verify isolation in T2 context
    token2 = set_current_tenant_id(str(e2.id))
    try:
        # Should be 0 because we didn't create any for T2
        c_count = Comment.objects.count()
        l_count = ArticleLike.objects.count()
        print(f"Tenant 2 sees {c_count} comments and {l_count} likes.")
        assert c_count == 0
        assert l_count == 0
    finally:
        clear_current_tenant_id(token2)

    print("\n--- ALL COMPREHENSIVE ISOLATION TESTS PASSED ---")

if __name__ == "__main__":
    from django.conf import settings
    settings.ALLOWED_HOSTS = ['*']
    verify_comprehensive_isolation()
