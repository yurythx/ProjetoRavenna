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
