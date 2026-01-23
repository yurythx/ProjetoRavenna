from django.db import transaction
from django.core.exceptions import ValidationError
from apps.core.tenant_context import get_current_tenant_id
from .models import Article

def article_create(*, title: str, content: str = '', content_json: dict = None, category, author, tags=None, banner=None, status: str = 'DRAFT', excerpt: str = '', tenant=None) -> Article:
    if tenant is None:
        tenant_id = get_current_tenant_id()
    else:
        tenant_id = getattr(tenant, 'id', tenant)

    with transaction.atomic():
        article = Article(
            tenant_id=tenant_id,
            title=title,
            content=content,
            content_json=content_json or {},
            category=category,
            author=author,
            status=status,
            is_published=(status == 'PUBLISHED'),
            banner=banner,
            excerpt=excerpt
        )
        article.save()
        
        if tags:
            article.tags.set(tags)
        
        if status == 'PUBLISHED':
            try:
                from apps.core.notification_utils import notify_article_published
                transaction.on_commit(lambda: notify_article_published(article))
            except ImportError:
                print("Warning: Could not import notify_article_published")
            except Exception as e:
                print(f"Error scheduling notification: {e}")
        
    return article

def article_update(article: Article, **data) -> Article:
    status_before = article.status
    with transaction.atomic():
        tags = data.pop('tags', None)
        
        for key, value in data.items():
            setattr(article, key, value)
        
        # Sync is_published with status for compatibility
        if 'status' in data:
            article.is_published = (data['status'] == 'PUBLISHED')
            
        article.save()
        
        if tags is not None:
             article.tags.set(tags)
        
        # Notify if changed to published
        if article.status == 'PUBLISHED' and status_before != 'PUBLISHED':
            try:
                from apps.core.notification_utils import notify_article_published
                transaction.on_commit(lambda: notify_article_published(article))
            except Exception:
                pass
             
    return article
