
import os
import sys
import django

# Add the project root to the python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.cache import cache
from apps.articles.analytics_models import ArticleView

def reset_views():
    print("Resetting article views...")
    
    # 1. Delete all views
    # This will cascade delete ReadingSession objects too
    count, _ = ArticleView.objects.all().delete()
    print(f"Deleted {count} view records (and associated reading sessions).")
    
    # 2. Clear cache
    # This wipes everything to ensure view counts are refreshed
    try:
        cache.clear()
        print("Cache cleared successfully.")
    except Exception as e:
        print(f"Warning: Failed to clear cache: {e}")
    
    print("Done! View counts should now be 0.")

if __name__ == '__main__':
    reset_views()
