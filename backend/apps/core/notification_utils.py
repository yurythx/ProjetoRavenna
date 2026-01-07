from .models import Notification


def create_notification(recipient, notification_type, title, message, link='', sender=None):
    """Helper function to create notifications"""
    return Notification.objects.create(
        recipient=recipient,
        sender=sender,
        notification_type=notification_type,
        title=title,
        message=message,
        link=link
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
            title='Nova resposta no seu comentário',
            message=f'{author_name} respondeu seu comentário',
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
            title='Novo comentário no seu artigo',
            message=f'{author_name} comentou em "{article.title}"',
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
            title='Novo artigo publicado!',
            message=f'"{article.title}" já está disponível para leitura.',
            link=f'/artigos/{article.slug}'
        )
