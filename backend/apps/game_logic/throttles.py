"""
Throttles (rate limiting) do app game_logic.

Este módulo define classes de throttling DRF para endpoints que recebem
requisições automáticas do servidor Unity com alta frequência.

## Classes

### GameServerThrottle
Rate limit por IP para endpoints server-to-server (`/events/` e `/game-state/`).

**Configuração (settings.py):**
```python
REST_FRAMEWORK = {
    "DEFAULT_THROTTLE_RATES": {
        "gameserver": "120/min",  # padrão recomendado para produção
    }
}
```

**Uso:**
```python
class GameEventWebhookView(APIView):
    throttle_classes = [GameServerThrottle]
```

**Observações:**
- O scope `"gameserver"` é separado dos throttles de usuário para não interferir.
- Em dev, defina `"gameserver": "1000/min"` para não bloquear testes.
- Cache key é baseado no IP do cliente (mesmo comportamento que `GameServerIPPermission`).
"""
from rest_framework.throttling import SimpleRateThrottle


class GameServerThrottle(SimpleRateThrottle):
    """
    Rate limit aplicado aos endpoints server-to-server (webhook e game-state).
    Configurável via REST_THROTTLE_GAMESERVER (padrão: 120/min).
    """
    scope = "gameserver"

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }
