import json
import logging
import time
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone

logger = logging.getLogger(__name__)

# ── Chat rooms ────────────────────────────────────────────────────────────────
# Allowed room names: "global", "faction_<name>", "zone_<key>"
# All names are validated before group_add to prevent injection.
_CHAT_ROOMS = frozenset({"global"})
_MAX_TEXT_LEN    = 200
_RATE_WINDOW_SEC = 10
_RATE_MAX_MSGS   = 5  # messages per window per user


def _valid_room(room: str) -> bool:
    if room in _CHAT_ROOMS:
        return True
    if room.startswith("faction_") and room[8:].isalpha() and len(room) <= 32:
        return True
    if room.startswith("zone_") and room[5:].replace("_", "").isalnum() and len(room) <= 32:
        return True
    return False


class ChatConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time text chat.

    URL: ws://<host>/ws/chat/<room>/
    Auth: JWT (via AuthMiddlewareStack — same as GameConsumer).

    Allowed rooms:
        global            — server-wide chat
        faction_<name>    — faction channel (e.g. faction_ordem)
        zone_<key>        — zone-scoped chat (e.g. zone_ruins)

    Incoming:  {"type": "chat.send", "text": "<message>"}
    Outgoing:  {"type": "chat.message", "user": "<display_name>",
                "user_id": "<uuid>", "text": "...", "ts": <unix_ms>}
    """

    async def connect(self):
        self.room = self.scope["url_route"]["kwargs"]["room"]
        self.user = self.scope.get("user")

        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        if self.user.is_banned:
            await self.close(code=4003)
            return

        if not _valid_room(self.room):
            await self.close(code=4004)
            return

        self.group_name = f"chat_{self.room}"
        self._rate_window_start = time.monotonic()
        self._rate_count = 0

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        logger.debug("chat.connect user=%s room=%s", self.user.id, self.room)

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return

        if data.get("type") != "chat.send":
            return

        text = str(data.get("text", "")).strip()
        if not text or len(text) > _MAX_TEXT_LEN:
            return

        # Per-connection rate limiting (no Redis needed — local window)
        now = time.monotonic()
        if now - self._rate_window_start > _RATE_WINDOW_SEC:
            self._rate_window_start = now
            self._rate_count = 0
        self._rate_count += 1
        if self._rate_count > _RATE_MAX_MSGS:
            await self.send(text_data=json.dumps({"type": "chat.error", "reason": "rate_limited"}))
            return

        display_name = getattr(self.user, "display_name", None) or self.user.username
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type":    "chat.message",
                "user":    display_name,
                "user_id": str(self.user.id),
                "text":    text,
                "ts":      int(time.time() * 1000),
            },
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            "type":    "chat.message",
            "user":    event["user"],
            "user_id": event["user_id"],
            "text":    event["text"],
            "ts":      event["ts"],
        }))


class GameConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time game events.

    URL: ws://<host>/ws/game/<session_id>/
    Auth: JWT Bearer token via query param ?token=<jwt> or Authorization header.

    Supported incoming messages:
        {"type": "ping"}
        {"type": "player.move", "map_key": str, "x": float, "y": float}

    Outgoing messages:
        {"type": "pong"}
        {"type": "world.update", "players": [...]}
        {"type": "session.kicked", "reason": str}
        {"type": "notification.new", ...}
    """

    async def connect(self):
        self.session_id = self.scope["url_route"]["kwargs"]["session_id"]
        self.user = self.scope.get("user")

        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        if self.user.is_banned:
            await self.close(code=4003)
            return

        session = await self._get_active_session()
        if not session:
            await self.close(code=4004)
            return

        self.map_group = f"map_{session.last_map_key}" if session.last_map_key else f"session_{self.session_id}"
        self.user_group = f"user_{self.user.id}"

        await self.channel_layer.group_add(self.map_group, self.channel_name)
        await self.channel_layer.group_add(self.user_group, self.channel_name)
        await self.accept()

        logger.info("ws.connect user=%s session=%s", self.user.id, self.session_id)

    async def disconnect(self, close_code):
        if hasattr(self, "map_group"):
            await self.channel_layer.group_discard(self.map_group, self.channel_name)
        if hasattr(self, "user_group"):
            await self.channel_layer.group_discard(self.user_group, self.channel_name)

        logger.info("ws.disconnect user=%s code=%s", getattr(self.user, "id", "?"), close_code)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return

        msg_type = data.get("type")

        if msg_type == "ping":
            await self._handle_ping()
        elif msg_type == "player.move":
            await self._handle_player_move(data)

    async def _handle_ping(self):
        await self._touch_session_heartbeat()
        await self.send(text_data=json.dumps({"type": "pong"}))

    async def _handle_player_move(self, data: dict):
        map_key = data.get("map_key", "")
        x = data.get("x", 0)
        y = data.get("y", 0)

        if map_key and map_key != getattr(self, "_current_map", None):
            old_group = self.map_group
            self.map_group = f"map_{map_key}"
            self._current_map = map_key
            await self.channel_layer.group_discard(old_group, self.channel_name)
            await self.channel_layer.group_add(self.map_group, self.channel_name)
            await self._update_session_map(map_key)

        await self.channel_layer.group_send(
            self.map_group,
            {
                "type": "world.update",
                "player_id": str(self.user.id),
                "display_name": self.user.display_name,
                "x": x,
                "y": y,
                "map_key": map_key,
            },
        )

    async def world_update(self, event):
        await self.send(text_data=json.dumps({"type": "world.update", **event}))

    async def session_kicked(self, event):
        await self.send(text_data=json.dumps({"type": "session.kicked", "reason": event.get("reason", "")}))
        await self.close(code=4003)

    async def notification_new(self, event):
        await self.send(text_data=json.dumps({"type": "notification.new", **event}))

    @database_sync_to_async
    def _get_active_session(self):
        from apps.game_logic.models import GameSession
        return GameSession.objects.filter(id=self.session_id, player=self.user, is_active=True).first()

    @database_sync_to_async
    def _touch_session_heartbeat(self):
        from apps.game_logic.models import GameSession
        # auto_now field updates on save(); calling save() with update_fields triggers it
        GameSession.objects.filter(id=self.session_id).update(is_active=True)

    @database_sync_to_async
    def _update_session_map(self, map_key: str):
        from apps.game_logic.models import GameSession
        GameSession.objects.filter(id=self.session_id).update(last_map_key=map_key)
