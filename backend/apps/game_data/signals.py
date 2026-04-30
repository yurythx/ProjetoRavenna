import logging
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

logger = logging.getLogger(__name__)

_CACHE_KEYS = [
    "game_data:bootstrap:full",
    "game_data:manifest",
]


def _invalidate_game_data_cache():
    try:
        from django.core.cache import cache
        cache.delete_many(_CACHE_KEYS)
        logger.debug("game_data cache invalidated")
    except Exception as exc:
        logger.warning("game_data cache invalidation failed: %s", exc)


def _register_signals():
    from apps.game_data.models import ItemTemplate, SkillTemplate, MapData

    for model in (ItemTemplate, SkillTemplate, MapData):
        post_save.connect(lambda sender, **kw: _invalidate_game_data_cache(), sender=model, weak=False)
        post_delete.connect(lambda sender, **kw: _invalidate_game_data_cache(), sender=model, weak=False)
