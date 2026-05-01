import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task
def rebuild_leaderboard_cache() -> dict:
    """
    Rebuild the Redis leaderboard Sorted Set from the database.
    Run periodically (e.g. every 10 min) to recover from cache eviction or Redis restart.
    """
    from django.conf import settings
    from apps.game_logic.models import PlayerStats
    from apps.game_logic.services import GameLogicService

    key = getattr(settings, "LEADERBOARD_CACHE_KEY", "game:leaderboard")
    entries = (
        PlayerStats.objects.select_related("owner")
        .only("level", "experience", "owner__id", "owner__display_name", "owner__username")
        .iterator(chunk_size=500)
    )

    try:
        from django_redis import get_redis_connection
        conn = get_redis_connection("default")
        pipeline = conn.pipeline(transaction=False)
        count = 0
        for stats in entries:
            score = stats.level * 1_000_000 + stats.experience
            display = stats.owner.display_name or stats.owner.username
            member = f"{stats.owner.id}:{display}"
            pipeline.zadd(key, {member: score})
            count += 1
            if count % 500 == 0:
                pipeline.execute()
                pipeline = conn.pipeline(transaction=False)
        pipeline.execute()
        logger.info("rebuild_leaderboard_cache: synced %s players to Redis", count)
        return {"synced": count}
    except Exception as exc:
        # Fallback to LocMemCache if Redis unavailable
        from django.core.cache import cache
        lb = {}
        count = 0
        for stats in PlayerStats.objects.select_related("owner").only(
            "level", "experience", "owner__id", "owner__display_name", "owner__username"
        ).iterator(chunk_size=500):
            score = stats.level * 1_000_000 + stats.experience
            display = stats.owner.display_name or stats.owner.username
            lb[f"{stats.owner.id}:{display}"] = score
            count += 1
        cache.set(key, lb, timeout=3600)
        logger.warning("rebuild_leaderboard_cache: Redis unavailable (%s), used LocMem fallback", exc)
        return {"synced": count, "fallback": True}


@shared_task
def deliver_quest_rewards(user_id: str, quest_id: str) -> dict:
    """
    Async delivery of quest rewards for a completed quest.
    Idempotent — safe to retry: complete_quest is guarded by status check.
    """
    from django.contrib.auth import get_user_model
    from apps.game_logic.services import GameLogicService
    User = get_user_model()
    try:
        user = User.objects.get(id=user_id)
        GameLogicService.complete_quest(user, quest_id)
        logger.info("deliver_quest_rewards: delivered rewards for user=%s quest=%s", user_id, quest_id)
        return {"ok": True}
    except Exception as exc:
        logger.error("deliver_quest_rewards: failed user=%s quest=%s error=%s", user_id, quest_id, exc)
        return {"ok": False, "error": str(exc)}


@shared_task
def cleanup_stale_game_sessions() -> dict:
    """Mark game sessions with no recent heartbeat as inactive."""
    from datetime import timedelta
    from django.utils import timezone
    from apps.game_logic.models import GameSession

    # Sessions with no heartbeat for more than 60 seconds are stale
    cutoff = timezone.now() - timedelta(seconds=60)
    updated = GameSession.objects.filter(is_active=True, last_heartbeat_at__lt=cutoff).update(
        is_active=False, ended_at=timezone.now()
    )
    logger.info("cleanup_stale_game_sessions: closed %s stale sessions", updated)
    return {"updated": updated}
