from django.db import transaction
from django.core.exceptions import ValidationError
from apps.core.tenant_context import get_current_tenant_id
from .models import Article

# Note: In a real scenario, basic Django validation might not be enough if we have complex rules about "Active Categories".
# But assuming standard usage, if strict category validation (e.g. check if category is 'active' in a SaaS logic) is needed, it goes here.

def article_create(*, title: str, content: str, category, author, tags=None, banner=None, is_published: bool = False, excerpt: str = '', tenant=None) -> Article:
    # 1. Validation Logic
    
    # 2. Transactional Mutation
    if tenant is None:
        tenant_id = get_current_tenant_id()
    else:
        tenant_id = getattr(tenant, 'id', tenant)

    with transaction.atomic():
        article = Article(
            tenant_id=tenant_id,
            title=title,
            content=content,
            category=category,
            author=author,
            is_published=is_published,
            banner=banner,
            excerpt=excerpt
        )
        article.save()
        
        if tags:
            article.tags.set(tags)
        
        if is_published:
            try:
                from apps.core.notification_utils import notify_article_published
                transaction.on_commit(lambda: notify_article_published(article))
            except ImportError:
                print("Warning: Could not import notify_article_published")
            except Exception as e:
                print(f"Error scheduling notification: {e}")
        
    return article

def article_update(article: Article, **data) -> Article:
    was_published = article.is_published
    with transaction.atomic():
        tags = data.pop('tags', None)
        
        for key, value in data.items():
            setattr(article, key, value)
        article.save()
        
        if tags is not None:
             article.tags.set(tags)
        
        # Notify if changed from draft to published
        if article.is_published and not was_published:
            from apps.core.notification_utils import notify_article_published
            transaction.on_commit(lambda: notify_article_published(article))
             
    return article
