from django.apps import AppConfig


class GameDataConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.game_data"
    label = "game_data"
    verbose_name = "Game Data Templates"

    def ready(self):
        from apps.game_data.signals import _register_signals
        _register_signals()
