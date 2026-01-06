import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.urls import get_resolver

resolver = get_resolver()

def list_urls(lis, depth=0, prefix=''):
    for entry in lis:
        pattern = str(entry.pattern)
        if hasattr(entry, 'url_patterns'):
            list_urls(entry.url_patterns, depth + 1, prefix + pattern)
        else:
            full_path = prefix + pattern
            if 'analytics' in full_path:
                print(f"{'  ' * depth}{full_path}")

print("Analytics-related URLs:")
list_urls(resolver.url_patterns)
