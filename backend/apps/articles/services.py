from django.db import transaction
from django.core.exceptions import ValidationError
from .models import Article

# Note: In a real scenario, basic Django validation might not be enough if we have complex rules about "Active Categories".
# But assuming standard usage, if strict category validation (e.g. check if category is 'active' in a SaaS logic) is needed, it goes here.

def article_create(*, title: str, content: str, category, author, tags=None, banner=None, is_published: bool = False) -> Article:
    # 1. Validation Logic
    # Removed len(title) check - moved to Serializer for better error handling consistency.
    
    # Example: Check if category is valid/active if Category had an 'is_active' field. 
    # category is a Model instance passed from the view/api layer (which likely got it from serializer validation).
    
    # 2. Transactional Mutation
    with transaction.atomic():
        article = Article(
            title=title,
            content=content,
            category=category,
            author=author,
            is_published=is_published,
            banner=banner
        )
        article.save()
        
        if tags:
            article.tags.set(tags)
        
    return article

def article_update(article: Article, **data) -> Article:
    with transaction.atomic():
        tags = data.pop('tags', None)
        
        for key, value in data.items():
            setattr(article, key, value)
        article.save()
        
        if tags is not None:
             article.tags.set(tags)
             
    return article
