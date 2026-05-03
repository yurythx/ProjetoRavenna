"""
Tests for WebSocket consumers (ChatConsumer).
Uses channels.testing.WebsocketCommunicator — no live server required.
"""
import json
import pytest
from channels.testing import WebsocketCommunicator
from channels.layers import get_channel_layer
from django.test import TransactionTestCase, override_settings

from apps.accounts.models import User
from apps.game_logic.consumers import ChatConsumer, _valid_room

# Use in-memory channel layer so tests don't need Redis
CHANNEL_LAYERS_TEST = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    }
}


class ValidRoomTests(TransactionTestCase):
    """Unit tests for the _valid_room helper — no network I/O."""

    def test_global_room_valid(self):
        self.assertTrue(_valid_room("global"))

    def test_faction_room_valid(self):
        self.assertTrue(_valid_room("faction_ordem"))
        self.assertTrue(_valid_room("faction_caos"))

    def test_zone_room_valid(self):
        self.assertTrue(_valid_room("zone_ruins"))
        self.assertTrue(_valid_room("zone_world_main"))

    def test_arbitrary_room_invalid(self):
        self.assertFalse(_valid_room("arbitrary"))
        self.assertFalse(_valid_room("../hack"))
        self.assertFalse(_valid_room("faction_"))  # empty suffix
        self.assertFalse(_valid_room("faction_" + "a" * 30))  # too long


@override_settings(CHANNEL_LAYERS=CHANNEL_LAYERS_TEST)
class ChatConsumerTests(TransactionTestCase):
    """Integration tests for ChatConsumer using in-process communicator."""

    def _make_scope(self, user, room="global"):
        return {
            "type": "websocket",
            "url_route": {"kwargs": {"room": room}},
            "user": user,
        }

    async def _connect(self, user, room="global"):
        scope = self._make_scope(user, room)
        comm = WebsocketCommunicator(ChatConsumer.as_asgi(), f"/ws/chat/{room}/", scope=scope)
        connected, _ = await comm.connect()
        return comm, connected

    async def test_unauthenticated_rejected(self):
        from django.contrib.auth.models import AnonymousUser
        scope = {
            "type": "websocket",
            "url_route": {"kwargs": {"room": "global"}},
            "user": AnonymousUser(),
        }
        comm = WebsocketCommunicator(ChatConsumer.as_asgi(), "/ws/chat/global/", scope=scope)
        connected, code = await comm.connect()
        self.assertFalse(connected)
        self.assertEqual(code, 4001)

    async def test_invalid_room_rejected(self):
        user = await User.objects.acreate_user(
            email="chatbad@example.com", username="chatbad", password="TestPass123!"
        )
        scope = self._make_scope(user, room="../../hack")
        comm = WebsocketCommunicator(ChatConsumer.as_asgi(), "/ws/chat/hack/", scope=scope)
        connected, code = await comm.connect()
        self.assertFalse(connected)
        self.assertEqual(code, 4004)

    async def test_authenticated_user_can_connect(self):
        user = await User.objects.acreate_user(
            email="chat1@example.com", username="chat1", password="TestPass123!"
        )
        comm, connected = await self._connect(user)
        self.assertTrue(connected)
        await comm.disconnect()

    async def test_send_and_receive_chat_message(self):
        user = await User.objects.acreate_user(
            email="chat2@example.com", username="chat2", password="TestPass123!"
        )
        comm, _ = await self._connect(user)

        await comm.send_json_to({"type": "chat.send", "text": "hello world"})
        response = await comm.receive_json_from()

        self.assertEqual(response["type"], "chat.message")
        self.assertEqual(response["text"], "hello world")
        self.assertEqual(response["user_id"], str(user.id))
        self.assertIn("ts", response)
        await comm.disconnect()

    async def test_empty_text_ignored(self):
        user = await User.objects.acreate_user(
            email="chat3@example.com", username="chat3", password="TestPass123!"
        )
        comm, _ = await self._connect(user)
        await comm.send_json_to({"type": "chat.send", "text": "   "})
        self.assertTrue(await comm.receive_nothing())
        await comm.disconnect()

    async def test_text_too_long_ignored(self):
        user = await User.objects.acreate_user(
            email="chat4@example.com", username="chat4", password="TestPass123!"
        )
        comm, _ = await self._connect(user)
        await comm.send_json_to({"type": "chat.send", "text": "x" * 201})
        self.assertTrue(await comm.receive_nothing())
        await comm.disconnect()

    async def test_rate_limit_enforced(self):
        from apps.game_logic.consumers import _RATE_MAX_MSGS
        user = await User.objects.acreate_user(
            email="chat5@example.com", username="chat5", password="TestPass123!"
        )
        comm, _ = await self._connect(user)

        for _ in range(_RATE_MAX_MSGS):
            await comm.send_json_to({"type": "chat.send", "text": "msg"})
            await comm.receive_json_from()  # consume each broadcast

        # The next message should trigger rate_limited
        await comm.send_json_to({"type": "chat.send", "text": "one too many"})
        response = await comm.receive_json_from()
        self.assertEqual(response["type"], "chat.error")
        self.assertEqual(response["reason"], "rate_limited")
        await comm.disconnect()
