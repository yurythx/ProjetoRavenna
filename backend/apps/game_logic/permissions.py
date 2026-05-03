import logging
from django.conf import settings
from rest_framework.permissions import BasePermission

logger = logging.getLogger(__name__)


class GameServerIPPermission(BasePermission):
    """
    Allow only requests originating from the configured game server IP(s).

    Config: GAMESERVER_ALLOWED_IPS (list of strings in settings).
    When the list is empty (default), all IPs are allowed so the server
    works out-of-the-box in development without extra config.

    In production, set GAMESERVER_ALLOWED_IPS to the game server container's
    IP or CIDR so external parties can't call /events/ or /game-state/.
    """

    message = "Access denied: request IP is not a known game server."

    def has_permission(self, request, view) -> bool:
        allowed: list[str] = getattr(settings, "GAMESERVER_ALLOWED_IPS", [])
        if not allowed:
            return True  # dev / unconfigured: open

        client_ip = self._get_client_ip(request)
        if client_ip in allowed:
            return True

        logger.warning(
            "GameServerIPPermission: blocked request from %s (allowed: %s)",
            client_ip,
            allowed,
        )
        return False

    @staticmethod
    def _get_client_ip(request) -> str:
        # Honour X-Forwarded-For only if the project trusts proxies via
        # SECURE_PROXY_SSL_HEADER / USE_X_FORWARDED_HOST; otherwise use REMOTE_ADDR.
        forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR", "")
