from .models import Notification


def create_notification(recipient, notification_type, title, message, link='', sender=None):
    """Helper function to create notifications"""
    from apps.core.tenant_context import get_current_tenant_id
    
    # Map link to target fields - extract article slug if present
    target_id = None
    target_type = ''
    if link and '/artigos/' in link:
        target_type = 'article'
        # Could extract article ID if needed, but slug is in link already
    
    return Notification.objects.create(
        recipient=recipient,
        type=notification_type,  # Changed from notification_type to type
        title=title,
        message=message,
        target_type=target_type,  # Store article/comment type
        tenant_id=get_current_tenant_id()  # Auto-set tenant
    )


def notify_comment_reply(comment):
    """Notify when someone replies to a comment"""
    parent_comment = comment.parent
    if parent_comment and parent_comment.author != comment.author:
        if comment.author:
            author_name = comment.author.first_name or comment.author.username or comment.author.email
        else:
            author_name = comment.guest_name or comment.guest_email or 'Visitante'
        create_notification(
            recipient=parent_comment.author,
            sender=comment.author,
            notification_type='COMMENT_REPLY',
            title='Seu comentário recebeu uma resposta!',
            message=f'{author_name} interagiu com você em um artigo.',
            link=f'/artigos/{comment.article.slug}#comment-{comment.id}'
        )


def notify_article_comment(comment):
    """Notify article author when someone comments"""
    article = comment.article
    if article.author and article.author != comment.author:
        if comment.author:
            author_name = comment.author.first_name or comment.author.username or comment.author.email
        else:
            author_name = comment.guest_name or comment.guest_email or 'Visitante'
        create_notification(
            recipient=article.author,
            sender=comment.author,
            notification_type='ARTICLE_COMMENT',
            title='Seu conteúdo está gerando conversas!',
            message=f'{author_name} comentou no seu artigo "{article.title}"',
            link=f'/artigos/{article.slug}#comment-{comment.id}'
        )


def notify_article_published(article):
    """Notify all users (except author) when an article is published"""
    from apps.accounts.models import CustomUser
    
    # In a larger app, we would use a subscription model or background task.
    # For now, we notify other active users.
    recipients = CustomUser.objects.filter(is_active=True).exclude(id=article.author_id)[:100]  # Limit to 100 for safety
    
    for recipient in recipients:
        create_notification(
            recipient=recipient,
            sender=article.author,
            notification_type='ARTICLE_PUBLISHED',
            title='Novidade no Projeto Ravenna!',
            message=f'O artigo "{article.title}" acaba de ser publicado. Confira agora.',
            link=f'/artigos/{article.slug}'
        )
