"""
Roteamento WebSocket do app game_logic.

Define os padrões de URL para os WebSocket consumers, montados pelo
`config/asgi.py` via `ProtocolTypeRouter`.

## Rotas WebSocket

| URL Pattern                          | Consumer       | Descrição                        |
|--------------------------------------|----------------|----------------------------------|
| `ws/game/<session_id>/`              | GameConsumer   | Eventos de jogo em tempo real    |
| `ws/chat/<room>/`                    | ChatConsumer   | Chat por sala                    |

## Como Montar (config/asgi.py)
```python
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from apps.game_logic.routing import websocket_urlpatterns

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(websocket_urlpatterns)
    ),
})
```

## Parâmetros de URL
- `session_id` — UUID hexadecimal da `GameSession` ativa do jogador
- `room` — nome da sala de chat (`global`, `faction_<x>`, `zone_<x>`)
"""
from django.urls import re_path

from apps.game_logic.consumers import ChatConsumer, GameConsumer

websocket_urlpatterns = [
    re_path(r"^ws/game/(?P<session_id>[0-9a-f-]+)/$", GameConsumer.as_asgi()),
    re_path(r"^ws/chat/(?P<room>[a-zA-Z0-9_-]+)/$",   ChatConsumer.as_asgi()),
]
