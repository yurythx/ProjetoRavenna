from django.urls import re_path

from apps.game_logic.consumers import ChatConsumer, GameConsumer

websocket_urlpatterns = [
    re_path(r"^ws/game/(?P<session_id>[0-9a-f-]+)/$", GameConsumer.as_asgi()),
    re_path(r"^ws/chat/(?P<room>[a-zA-Z0-9_-]+)/$",   ChatConsumer.as_asgi()),
]
