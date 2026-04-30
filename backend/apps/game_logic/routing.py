from django.urls import re_path

from apps.game_logic.consumers import GameConsumer

websocket_urlpatterns = [
    re_path(r"^ws/game/(?P<session_id>[0-9a-f-]+)/$", GameConsumer.as_asgi()),
]
