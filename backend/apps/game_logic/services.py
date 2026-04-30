from django.db import transaction
from django.utils import timezone
from apps.accounts.models import User
from apps.game_data.models import ItemTemplate
from apps.game_logic.models import PlayerInventory, PlayerItem, PlayerSkill, PlayerStats, QuestProgress

class GameLogicService:
    """Service class for game logic operations with concurrency and anti-cheat."""

    XP_PER_LEVEL = 100
    POINTS_PER_LEVEL = 5

    @staticmethod
    @transaction.atomic
    def get_or_create_player_instances(user: User):
        """Get or create all player game instances with locking."""
        inventory, _ = PlayerInventory.objects.select_for_update().get_or_create(owner=user)
        stats, _ = PlayerStats.objects.select_for_update().get_or_create(owner=user)
        return {"inventory": inventory, "stats": stats}

    @staticmethod
    @transaction.atomic
    def add_item_to_inventory(user: User, item_template_id: str, quantity: int = 1) -> PlayerInventory:
        """Add item to player inventory with locking."""
        inventory, _ = PlayerInventory.objects.select_for_update().get_or_create(owner=user)
        item_template = ItemTemplate.objects.get(id=item_template_id)

        if quantity < 1:
            raise ValueError("Quantity must be at least 1")

        def get_first_free_slot_index() -> int:
            used = set(
                PlayerItem.objects.filter(inventory=inventory).values_list("slot_index", flat=True)
            )
            for i in range(inventory.max_slots):
                if i not in used:
                    return i
            raise ValueError("Inventory is full")

        remaining = quantity

        if item_template.stack_size > 1:
            stacks = PlayerItem.objects.select_for_update().filter(
                inventory=inventory,
                item_template=item_template,
                quantity__lt=item_template.stack_size,
            ).order_by("slot_index")

            for stack in stacks:
                can_add = item_template.stack_size - stack.quantity
                add_now = min(can_add, remaining)
                if add_now > 0:
                    stack.quantity += add_now
                    stack.save(update_fields=["quantity", "updated_at"])
                    remaining -= add_now
                if remaining == 0:
                    break

            while remaining > 0:
                slot_index = get_first_free_slot_index()
                add_now = min(item_template.stack_size, remaining)
                PlayerItem.objects.create(
                    inventory=inventory,
                    item_template=item_template,
                    quantity=add_now,
                    slot_index=slot_index,
                )
                remaining -= add_now
        else:
            while remaining > 0:
                slot_index = get_first_free_slot_index()
                PlayerItem.objects.create(
                    inventory=inventory,
                    item_template=item_template,
                    quantity=1,
                    slot_index=slot_index,
                )
                remaining -= 1

        inventory.slots_used = PlayerItem.objects.filter(inventory=inventory).count()
        inventory.save(update_fields=["slots_used", "updated_at"])

        return inventory

    @staticmethod
    @transaction.atomic
    def remove_item_from_inventory(user: User, item_index: int) -> PlayerInventory:
        """Remove item from player inventory with locking."""
        inventory, _ = PlayerInventory.objects.select_for_update().get_or_create(owner=user)

        if item_index < 0 or item_index >= inventory.max_slots:
            raise ValueError("Invalid item index")

        item = PlayerItem.objects.select_for_update().filter(inventory=inventory, slot_index=item_index).first()
        if not item:
            raise ValueError("Invalid item index")

        item.delete()
        inventory.slots_used = PlayerItem.objects.filter(inventory=inventory).count()
        inventory.save(update_fields=["slots_used", "updated_at"])

        return inventory

    @staticmethod
    @transaction.atomic
    def update_player_stats(user: User, stats_data: dict) -> PlayerStats:
        """Update player stats with locking."""
        stats, _ = PlayerStats.objects.select_for_update().get_or_create(owner=user)

        allowed_fields = ["health", "mana"]

        for field, value in stats_data.items():
            if field in allowed_fields:
                if value is None:
                    continue
                if isinstance(value, int) and value < 0:
                    raise ValueError(f"{field} cannot be negative")
                setattr(stats, field, value)

        if stats.max_health < 1: stats.max_health = 1
        if stats.max_mana < 0: stats.max_mana = 0
        if stats.health < 0: stats.health = 0
        if stats.mana < 0: stats.mana = 0
        if stats.health > stats.max_health: stats.health = stats.max_health
        if stats.mana > stats.max_mana: stats.mana = stats.max_mana

        stats.save()
        return stats

    @staticmethod
    @transaction.atomic
    def gain_experience(user: User, amount: int, hwid: str = "") -> PlayerStats:
        """Grant experience with basic anti-cheat."""
        stats, _ = PlayerStats.objects.select_for_update().get_or_create(owner=user)

        if amount < 1:
            raise ValueError("amount must be at least 1")

        if hwid and user.hwid and user.hwid != hwid:
            pass

        if amount > 10000:
            raise ValueError("Impossible experience gain detected")

        stats.experience += amount
        while stats.experience >= GameLogicService.XP_PER_LEVEL:
            stats.experience -= GameLogicService.XP_PER_LEVEL
            stats.level += 1
            stats.points_remaining += GameLogicService.POINTS_PER_LEVEL

        stats.save(update_fields=["experience", "level", "points_remaining", "updated_at"])
        GameLogicService.update_leaderboard_cache(user, stats)
        return stats

    @staticmethod
    def update_leaderboard_cache(user: User, stats: PlayerStats):
        """Update Redis Sorted Set leaderboard. Score = level * 1_000_000 + experience."""
        from django.conf import settings
        key = getattr(settings, "LEADERBOARD_CACHE_KEY", "game:leaderboard")
        score = stats.level * 1_000_000 + stats.experience
        member = f"{user.id}:{user.display_name or user.username}"
        try:
            from django_redis import get_redis_connection
            conn = get_redis_connection("default")
            conn.zadd(key, {member: score})
        except Exception:
            # Fallback: Django generic cache (dict in LocMemCache when Redis unavailable)
            from django.core.cache import cache
            lb = cache.get(key, {})
            lb[member] = score
            cache.set(key, lb, timeout=3600)

    @staticmethod
    def get_leaderboard(limit: int = 10) -> list[dict]:
        """Return top-N players using Redis ZREVRANGE (O(log N + M))."""
        from django.conf import settings
        key = getattr(settings, "LEADERBOARD_CACHE_KEY", "game:leaderboard")
        size = min(limit, getattr(settings, "LEADERBOARD_SIZE", 100))
        try:
            from django_redis import get_redis_connection
            conn = get_redis_connection("default")
            entries = conn.zrevrange(key, 0, size - 1, withscores=True)
            results = []
            for rank, (member_bytes, score) in enumerate(entries, start=1):
                member = member_bytes.decode() if isinstance(member_bytes, bytes) else member_bytes
                _, display_name = member.split(":", 1) if ":" in member else (member, member)
                results.append({"rank": rank, "display_name": display_name, "score": int(score)})
            return results
        except Exception:
            from django.core.cache import cache
            lb: dict = cache.get(key, {})
            sorted_lb = sorted(lb.items(), key=lambda x: x[1], reverse=True)[:size]
            return [
                {"rank": i + 1, "display_name": m.split(":", 1)[-1], "score": int(s)}
                for i, (m, s) in enumerate(sorted_lb)
            ]

    @staticmethod
    @transaction.atomic
    def allocate_points(user: User, allocations: dict) -> PlayerStats:
        stats, _ = PlayerStats.objects.select_for_update().get_or_create(owner=user)
        allowed = ["strength", "agility", "intelligence", "vitality"]
        total = 0
        for k in allowed:
            v = int(allocations.get(k, 0) or 0)
            if v < 0: raise ValueError(f"{k} cannot be negative")
            total += v

        if total < 1: raise ValueError("No points to allocate")
        if total > stats.points_remaining: raise ValueError("Not enough points")

        for k in allowed:
            v = int(allocations.get(k, 0) or 0)
            if v: setattr(stats, k, getattr(stats, k) + v)

        stats.points_remaining -= total
        stats.save(update_fields=allowed + ["points_remaining", "updated_at"])
        return stats

    @staticmethod
    @transaction.atomic
    def start_game_session(user: User, hwid: str = "", ip: str = "", map_key: str = "") -> object:
        from apps.game_logic.models import GameSession
        from django.utils import timezone
        GameSession.objects.filter(player=user, is_active=True).update(is_active=False, ended_at=timezone.now())
        return GameSession.objects.create(player=user, hwid=hwid, ip_address=ip, last_map_key=map_key, is_active=True)

    @staticmethod
    @transaction.atomic
    def end_game_session(user: User):
        from apps.game_logic.models import GameSession
        from django.utils import timezone
        GameSession.objects.filter(player=user, is_active=True).update(is_active=False, ended_at=timezone.now())

    @staticmethod
    @transaction.atomic
    def start_quest(user: User, quest_id: str) -> QuestProgress:
        progress, created = QuestProgress.objects.select_for_update().get_or_create(
            owner=user, quest_id=quest_id, defaults={"status": "in_progress", "started_at": timezone.now()}
        )
        if not created and progress.status == "not_started":
            progress.status = "in_progress"
            progress.started_at = timezone.now()
            progress.save(update_fields=["status", "started_at", "updated_at"])
        return progress

    @staticmethod
    @transaction.atomic
    def complete_quest(user: User, quest_id: str) -> QuestProgress:
        from django.utils import timezone
        progress = QuestProgress.objects.select_for_update().get(owner=user, quest_id=quest_id)
        progress.status = "completed"
        progress.completed_at = timezone.now()
        progress.save(update_fields=["status", "completed_at", "updated_at"])
        return progress

    @staticmethod
    @transaction.atomic
    def learn_skill(user: User, skill_template_id: str) -> PlayerSkill:
        from apps.game_data.models import SkillTemplate
        skill_template = SkillTemplate.objects.get(id=skill_template_id)
        player_skill, created = PlayerSkill.objects.select_for_update().get_or_create(
            owner=user, skill_template=skill_template, defaults={"is_equipped": False}
        )
        if not created:
            player_skill.current_level += 1
            player_skill.save(update_fields=["current_level", "updated_at"])
        return player_skill
