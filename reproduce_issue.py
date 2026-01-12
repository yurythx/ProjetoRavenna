
import os
import django
import sys

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.accounts.models import CustomUser
from apps.articles.models import Category, Tag
from apps.articles.services import article_create

def run():
    print("Starting test...")
    u = CustomUser.objects.first()
    if not u:
        print("No user found, creating one")
        u = CustomUser.objects.create_user('testuser', 'test@example.com', 'password')
        
    c = Category.objects.first()
    if not c:
        print("No category found, creating one")
        c = Category.objects.create(name="TestCat")

    t = Tag.objects.first()
    tags = [t] if t else []

    try:
        print(f"Creating article with user={u}, cat={c}, tags={tags}")
        article = article_create(
            title="Test Script Article", 
            content="Content checks out.", 
            category=c, 
            author=u, 
            tags=tags, 
            is_published=True
        )
        print(f"Success! Article created: {article.slug}")
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error: {e}")

if __name__ == "__main__":
    run()
