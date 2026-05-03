import logging
import os

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class GameLogicConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.game_logic"
    label = "game_logic"
    verbose_name = "Game Logic (Dynamic Instances)"

    def ready(self):
        debug = os.environ.get("DEBUG", "False").lower() in ("true", "1")
        secret = os.environ.get("DJANGO_WEBHOOK_SECRET", "changeme")
        if not debug and secret == "changeme":
            logger.critical(
                "SECURITY: DJANGO_WEBHOOK_SECRET is set to the default 'changeme'. "
                "All game-server webhooks are unauthenticated. "
                "Set a strong secret before deploying to production."
            )
