from django.core.management.base import BaseCommand
from apps.articles.models import Article


class Command(BaseCommand):
    help = 'Fix double https:// in MinIO URLs'

    def handle(self, *args, **kwargs):
        self.stdout.write("🔍 Checking for double https:// in article banners...")
        
        articles = Article.objects.exclude(banner='')
        fixed_count = 0
        
        for article in articles:
            if article.banner:
                old_url = str(article.banner)
                
                # Check if URL has double https://
                if 'https://https://' in old_url or 'http://https://' in old_url:
                    # Fix the URL by removing duplicate protocol
                    new_url = old_url.replace('https://https://', 'https://')
                    new_url = new_url.replace('http://https://', 'https://')
                    
                    self.stdout.write(f"  ❌ Fixing: {article.title}")
                    self.stdout.write(f"     Old: {old_url}")
                    self.stdout.write(f"     New: {new_url}")
                    
                    # Update the database directly
                    article.banner = new_url
                    article.save(update_fields=['banner'])
                    fixed_count += 1
                else:
                    self.stdout.write(f"  ✅ OK: {article.title}")
        
        if fixed_count > 0:
            self.stdout.write(self.style.SUCCESS(f"\n✅ Fixed {fixed_count} articles!"))
        else:
            self.stdout.write(self.style.SUCCESS("\n✅ No URLs needed fixing!"))
