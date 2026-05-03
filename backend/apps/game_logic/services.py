from __future__ import annotations
"""
Serviços de lógica de jogo — camada de negócio do app game_logic.

Este módulo contém `GameLogicService`, a classe central de operações do jogo.
Todas as operações que modificam dados do jogador devem passar por aqui,
garantindo transações atômicas, anti-cheat e consistência de estado.

## Classe: GameLogicService

Classe estática (sem instanciação) com métodos transacionais para manipular
modelos de jogo. Cada método usa `@transaction.atomic` para garantir que
falhas parciais não corrompam o estado.

### Constantes
- `XP_PER_LEVEL = 100` — XP necessário para subir de nível
- `POINTS_PER_LEVEL = 5` — pontos de atributo ganhos por level up

### Métodos Principais

#### get_or_create_player_instances(user)
Obtém ou cria `PlayerInventory` + `PlayerStats` com lock pessimista
(`select_for_update`) para evitar condição de corrida em criações simultâneas.

#### add_item_to_inventory(user, item_template_id, quantity)
Adiciona item ao inventário com empilhamento automático (stacking).
Lança `ValueError` se inventário cheio ou quantidade < 1.

#### equip_item(user, item_id) / unequip_item(user, item_id)
Equipa/desequipa item, calculando bônus de atributos do `ItemTemplate`.
Lança `ValueError` se item não pertence ao jogador ou já equipado/desequipado.

#### gain_experience(user, amount)
Concede XP e processa level ups em cascata (pode subir vários níveis de uma vez).
A cada level up: incrementa `level`, zera XP relativo, concede `POINTS_PER_LEVEL` pontos,
recalcula HP/MP máximo com base em vitalidade.

#### allocate_points(user, **attrs)
Aloca pontos de atributo validando saldo disponível.
`attrs` aceita: `strength`, `agility`, `intelligence`, `vitality`.
Lança `ValueError` se pontos insuficientes.

#### create_character(user, name, class_type, race, faction)
Cria o personagem inicial do jogador no onboarding com stats base por classe.
Lança `ValueError` se personagem já existe.

#### get_leaderboard(limit) / update_leaderboard_score(user, score)
Lê/atualiza ranking no Redis (sorted set `game:leaderboard`).

## Observações
- Nunca chame `save()` diretamente em modelos de jogo fora deste service.
- Para operações em lote do servidor Unity, use os endpoints de webhook
  (`/api/v1/game-logic/events/`) que chamam este service internamente.
"""
import logging

from django.db import transaction
from django.utils import timezone
from apps.accounts.models import User
from apps.game_data.models import ItemTemplate
from apps.game_logic.models import Character, Party, PartyMember, PlayerInventory, PlayerItem, PlayerSkill, PlayerStats, QuestProgress, QuestTemplate

logger = logging.getLogger(__name__)

class GameLogicService:
    """Service class for game logic operations with concurrency and anti-cheat."""

    XP_PER_LEVEL = 100
    POINTS_PER_LEVEL = 5

    @staticmethod
    @transaction.atomic
    def get_or_create_player_instances(character: Character):
        """Get character game instances with locking."""
        inventory, _ = PlayerInventory.objects.select_for_update().get_or_create(character=character)
        stats, _ = PlayerStats.objects.select_for_update().get_or_create(character=character)
        return {"inventory": inventory, "stats": stats}

    @staticmethod
    @transaction.atomic
    def add_item_to_inventory(character: Character, item_template_id: str, quantity: int = 1) -> PlayerInventory:
        """Add item to character inventory with locking."""
        inventory, _ = PlayerInventory.objects.select_for_update().get_or_create(character=character)
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
    def remove_item_from_inventory(character: Character, item_index: int) -> PlayerInventory:
        """Remove item from character inventory with locking."""
        inventory, _ = PlayerInventory.objects.select_for_update().get_or_create(character=character)

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
    def update_player_stats(character: Character, stats_data: dict) -> PlayerStats:
        """Update character stats with locking."""
        stats, _ = PlayerStats.objects.select_for_update().get_or_create(character=character)

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
    def gain_experience(character: Character, amount: int, hwid: str = "", bypass_anticheat: bool = False) -> PlayerStats:
        """Grant experience with basic anti-cheat."""
        stats, _ = PlayerStats.objects.select_for_update().get_or_create(character=character)

        if amount < 1:
            raise ValueError("amount must be at least 1")

        if hwid and user.hwid and user.hwid != hwid:
            pass

        if not bypass_anticheat and amount > 10000:
            raise ValueError("Impossible experience gain detected")

        stats.experience += amount
        while stats.experience >= GameLogicService.XP_PER_LEVEL:
            stats.experience -= GameLogicService.XP_PER_LEVEL
            stats.level += 1
            stats.points_remaining += GameLogicService.POINTS_PER_LEVEL

        stats.save(update_fields=["experience", "level", "points_remaining", "updated_at"])
        GameLogicService.update_leaderboard_cache(user, stats)
        GameLogicService._refresh_state_cache(user)
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
    def allocate_points(character: Character, allocations: dict) -> PlayerStats:
        stats, _ = PlayerStats.objects.select_for_update().get_or_create(character=character)
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
        GameLogicService._refresh_state_cache(user)
        return stats

    @staticmethod
    @transaction.atomic
    def start_game_session(character: Character, hwid: str = "", ip: str = "", map_key: str = "") -> object:
        from apps.game_logic.models import GameSession
        from django.utils import timezone
        GameSession.objects.filter(character=character, is_active=True).update(is_active=False, ended_at=timezone.now())
        return GameSession.objects.create(character=character, ip_address=ip, is_active=True)

    @staticmethod
    @transaction.atomic
    def end_game_session(user: User):
        from apps.game_logic.models import GameSession
        from django.utils import timezone
        GameSession.objects.filter(player=user, is_active=True).update(is_active=False, ended_at=timezone.now())

    @staticmethod
    @transaction.atomic
    def record_pvp_kill(killer: User, victim: User):
        """Increment pvp_kills for killer and pvp_deaths for victim atomically."""
        from apps.game_logic.models import PlayerStats
        killer_stats, _ = PlayerStats.objects.select_for_update().get_or_create(owner=killer)
        killer_stats.pvp_kills += 1
        killer_stats.save(update_fields=["pvp_kills", "updated_at"])

        victim_stats, _ = PlayerStats.objects.select_for_update().get_or_create(owner=victim)
        victim_stats.pvp_deaths += 1
        victim_stats.save(update_fields=["pvp_deaths", "updated_at"])

    @staticmethod
    @transaction.atomic
    def start_quest(character: Character, quest_id: str) -> QuestProgress:
        progress, created = QuestProgress.objects.select_for_update().get_or_create(
            character=character, quest_id=quest_id, defaults={"status": "in_progress", "started_at": timezone.now()}
        )
        if not created and progress.status == "not_started":
            progress.status = "in_progress"
            progress.started_at = timezone.now()
            progress.save(update_fields=["status", "started_at", "updated_at"])
        return progress

    @staticmethod
    @transaction.atomic
    def complete_quest(character: Character, quest_id: str) -> QuestProgress:
        progress = QuestProgress.objects.select_for_update().get(character=character, quest_id=quest_id)
        progress.status = "completed"
        progress.completed_at = timezone.now()
        progress.save(update_fields=["status", "completed_at", "updated_at"])

        # Deliver rewards when quest_id is a valid QuestTemplate UUID
        try:
            template = QuestTemplate.objects.get(id=quest_id)
        except Exception:
            return progress  # Non-UUID or unknown id — no rewards, just mark complete

        rewards = template.rewards or {}
        xp   = int(rewards.get("xp",   0))
        gold = int(rewards.get("gold", 0))
        items = list(rewards.get("items", []))

        if xp > 0:
            GameLogicService.gain_experience(user, xp, bypass_anticheat=True)

        if gold > 0:
            inventory, _ = PlayerInventory.objects.select_for_update().get_or_create(character=character)
            inventory.gold += gold
            inventory.save(update_fields=["gold", "updated_at"])

        for item_reward in items:
            item_id = item_reward.get("item_template_id")
            qty = int(item_reward.get("quantity", 1))
            if item_id and qty > 0:
                try:
                    GameLogicService.add_item_to_inventory(user, item_id, qty)
                except Exception as exc:
                    logger.warning("complete_quest: failed to deliver item %s: %s", item_id, exc)

        if template.is_repeatable:
            progress.status = "in_progress"
            progress.completed_at = None
            progress.save(update_fields=["status", "completed_at", "updated_at"])

        return progress

    @staticmethod
    def save_player_position(character: Character, pos_x: int, pos_y: int, hp: int) -> None:
        """Persist last known position and HP for cross-restart state restore."""
        safe_hp = max(1, min(hp, 99_999))
        PlayerStats.objects.filter(character=character).update(
            last_pos_x=pos_x,
            last_pos_y=pos_y,
            health=safe_hp,
        )

    @staticmethod
    @transaction.atomic
    def update_kill_progress(character: Character, npc_type: str) -> list:
        """Increment kill counters in active quests that match npc_type."""
        kill_key = f"kill_{npc_type}"
        progresses = list(
            QuestProgress.objects.select_for_update()
            .filter(character=character, status="in_progress")
        )
        updated = []
        for progress in progresses:
            try:
                template = QuestTemplate.objects.get(id=progress.quest_id)
            except Exception:
                continue

            objectives = template.objectives or []
            matching = [obj for obj in objectives if isinstance(obj, dict) and obj.get("key") == kill_key]
            if not matching:
                continue

            current = dict(progress.current_objectives or {})
            changed = False
            for obj in matching:
                key = obj["key"]
                target = int(obj.get("target_count", 1))
                if int(current.get(key, 0)) < target:
                    current[key] = int(current.get(key, 0)) + 1
                    changed = True

            if not changed:
                continue

            progress.current_objectives = current
            progress.save(update_fields=["current_objectives", "updated_at"])
            updated.append(progress)

            all_done = all(
                int(current.get(obj["key"], 0)) >= int(obj.get("target_count", 1))
                for obj in objectives
                if isinstance(obj, dict) and obj.get("key")
            )
            if all_done:
                try:
                    GameLogicService.complete_quest(user, progress.quest_id)
                except Exception as exc:
                    logger.warning("update_kill_progress: complete_quest failed for %s: %s", progress.quest_id, exc)

        return updated

    @staticmethod
    def get_equipment_bonuses(character: Character) -> dict:
        """Return dict of summed stat bonuses from all currently equipped items."""
        bonuses: dict = {
            "phys_damage": 0, "mag_damage": 0,
            "phys_defense": 0, "mag_defense": 0,
            "health": 0, "mana": 0,
            "attack_speed": 0.0, "speed": 0,
        }
        inventory = PlayerInventory.objects.filter(character=character).first()
        if not inventory:
            return bonuses
        equipped = PlayerItem.objects.filter(
            inventory=inventory
        ).exclude(equip_slot="").select_related("item_template")
        for item in equipped:
            t = item.item_template
            bonuses["phys_damage"]  += t.base_phys_damage
            bonuses["mag_damage"]   += t.base_mag_damage
            bonuses["phys_defense"] += t.base_phys_defense
            bonuses["mag_defense"]  += t.base_mag_defense
            bonuses["health"]       += t.base_health
            bonuses["mana"]         += t.base_mana
            bonuses["attack_speed"] += t.base_attack_speed
            bonuses["speed"]        += t.base_speed
        return bonuses

    _VALID_EQUIP_SLOTS = {
        "weapon", "offhand",
        "helmet", "chest", "gloves", "boots",
        "ring_1", "ring_2", "amulet",
    }

    # ── Per-class allowed weapon types ───────────────────────────────────────
    #
    # Weapon damage categories (set in ItemTemplate):
    #   Physical-only  : sword, dagger, bow
    #   Magical-only   : staff, wand
    #   Hybrid (phys+mag): mace, hammer, lance
    #   Off-hand only  : shield
    #
    # Two-handedness is stored on ItemTemplate.is_two_handed, NOT here.
    # Tanks can use 1H weapons (with shield) OR 2H hybrid weapons.
    _CLASS_WEAPON_TYPES: dict[str, frozenset[str]] = {
        # Tanks: 1H sword/mace + shield  OR  2H hammer/lance/mace (hybrid damage)
        "paladino":         frozenset({"sword", "mace", "hammer", "lance"}),
        "cavaleiro_dragao": frozenset({"sword", "mace", "hammer", "lance"}),
        # Magic DPS: staff (always 2H), wand (1H or 2H)
        "mage":             frozenset({"staff", "wand"}),
        "eldari":           frozenset({"staff", "wand"}),
        "ignis":            frozenset({"staff", "wand"}),
        "necromante":       frozenset({"staff", "wand"}),
        # Physical DPS
        "archer":           frozenset({"bow"}),
        "shadow":           frozenset({"sword", "dagger"}),
    }

    # ── Per-class allowed armor types ─────────────────────────────────────────
    _CLASS_ARMOR_TYPES: dict[str, frozenset[str]] = {
        "paladino":         frozenset({"heavy"}),
        "mage":             frozenset({"light"}),
        "archer":           frozenset({"medium"}),
        "eldari":           frozenset({"light"}),
        "cavaleiro_dragao": frozenset({"heavy"}),
        "ignis":            frozenset({"light"}),
        "shadow":           frozenset({"medium"}),
        "necromante":       frozenset({"light"}),
    }

    # Classes that can use a shield in the offhand slot
    _SHIELD_CLASSES: frozenset[str] = frozenset({"paladino", "cavaleiro_dragao"})

    # Classes that can equip a weapon in the offhand slot (dual wield)
    _DUAL_WIELD_CLASSES: frozenset[str] = frozenset({"shadow"})

    @staticmethod
    @transaction.atomic
    def equip_item(character: Character, player_item_id: str, equip_slot: str) -> PlayerItem:
        """Equip an inventory item into a specific slot."""
        if equip_slot not in GameLogicService._VALID_EQUIP_SLOTS:
            raise ValueError(f"Invalid equip slot: '{equip_slot}'")

        player_class: str = character.character_class

        inventory = PlayerInventory.objects.select_for_update().get(character=character)
        item = PlayerItem.objects.select_for_update().get(id=player_item_id, inventory=inventory)
        t = item.item_template

        template_slot = t.equip_slot
        weapon_type   = t.weapon_type
        armor_type    = t.armor_type
        is_two_handed = t.is_two_handed

        if not template_slot:
            raise ValueError("This item cannot be equipped")

        # ── Ring ─────────────────────────────────────────────────────────────
        if template_slot == "ring":
            if equip_slot not in ("ring_1", "ring_2"):
                raise ValueError("Ring items must be equipped in ring_1 or ring_2")

        # ── Shield ───────────────────────────────────────────────────────────
        elif weapon_type == "shield":
            if equip_slot != "offhand":
                raise ValueError("Shields can only be equipped in the offhand slot")
            if player_class and player_class not in GameLogicService._SHIELD_CLASSES:
                raise ValueError(
                    f"Class '{player_class}' cannot use a shield. "
                    f"Only tanks (paladino, cavaleiro_dragao) can."
                )

        # ── Weapon (main-hand or dual-wield offhand) ──────────────────────────
        elif template_slot == "weapon":
            if equip_slot == "offhand":
                # Dual wield — only Shadow, item must be one-handed
                if is_two_handed:
                    raise ValueError("Two-handed weapons cannot be equipped in the offhand slot")
                if player_class and player_class not in GameLogicService._DUAL_WIELD_CLASSES:
                    raise ValueError(
                        f"Class '{player_class}' cannot dual wield. Only Shadow can."
                    )
                if player_class and weapon_type:
                    allowed = GameLogicService._CLASS_WEAPON_TYPES.get(player_class, frozenset())
                    if weapon_type not in allowed:
                        raise ValueError(
                            f"Class '{player_class}' cannot use weapon type '{weapon_type}' in offhand"
                        )
            elif equip_slot == "weapon":
                # Class weapon restriction
                if player_class and weapon_type:
                    allowed = GameLogicService._CLASS_WEAPON_TYPES.get(player_class, frozenset())
                    if weapon_type not in allowed:
                        raise ValueError(
                            f"Class '{player_class}' cannot use weapon type '{weapon_type}'. "
                            f"Allowed: {', '.join(sorted(allowed))}"
                        )
                # Two-handed weapons clear the offhand slot
                if is_two_handed:
                    PlayerItem.objects.select_for_update().filter(
                        inventory=inventory, equip_slot="offhand"
                    ).update(equip_slot="")
            else:
                raise ValueError("Weapons must be equipped in 'weapon' or 'offhand' slot")

        # ── Armor (helmet, chest, gloves, boots) ──────────────────────────────
        else:
            if template_slot != equip_slot:
                raise ValueError(
                    f"This item must be equipped in the '{template_slot}' slot"
                )
            if player_class and armor_type:
                allowed = GameLogicService._CLASS_ARMOR_TYPES.get(player_class, frozenset())
                if armor_type not in allowed:
                    raise ValueError(
                        f"Class '{player_class}' cannot wear {armor_type} armor. "
                        f"Allowed: {', '.join(sorted(allowed))}"
                    )

        # Silently unequip whatever is already in the target slot
        PlayerItem.objects.select_for_update().filter(
            inventory=inventory, equip_slot=equip_slot
        ).exclude(id=item.id).update(equip_slot="")

        item.equip_slot = equip_slot
        item.save(update_fields=["equip_slot", "updated_at"])
        GameLogicService._refresh_state_cache(user)
        return item

    @staticmethod
    @transaction.atomic
    def unequip_item(user: User, equip_slot: str) -> None:
        """Remove the equipped flag from the item in the given slot."""
        if equip_slot not in GameLogicService._VALID_EQUIP_SLOTS:
            raise ValueError(f"Invalid equip slot: '{equip_slot}'")
        inventory = PlayerInventory.objects.select_for_update().get(owner=user)
        PlayerItem.objects.select_for_update().filter(
            inventory=inventory, equip_slot=equip_slot
        ).update(equip_slot="")
        GameLogicService._refresh_state_cache(user)

    @staticmethod
    def preload_player_state_to_redis(user: User) -> None:
        """Write the full player state to cache (Redis in prod) so the game server
        can read it in sub-1ms instead of doing an HTTP roundtrip.

        Key: game:player_state:{user_id}   TTL: 3600 s
        Called after JWT token generation and after every state-mutating operation
        (equip, allocate, level-up, skill upgrade, party change) via on_commit hook.
        """
        from django.core.cache import cache
        stats = PlayerStats.objects.filter(owner=user).first()
        if not stats:
            return
        bonuses = GameLogicService.get_equipment_bonuses(user)
        skill_qs = PlayerSkill.objects.filter(owner=user, is_equipped=True).select_related("skill_template")
        skill_list = [
            {
                "server_id": s.skill_template.server_id,
                "current_level": s.current_level,
                "slot_index": s.slot_index,
            }
            for s in skill_qs
            if s.skill_template.server_id is not None
        ]
        passive_bonuses = GameLogicService.compute_passive_bonuses(user)
        active_party = GameLogicService.get_active_party(user)
        state = {
            "hp":           stats.health,
            "max_hp":       stats.max_health,
            "mana":         stats.mana,
            "max_mana":     stats.max_mana,
            "pos_x":        stats.last_pos_x,
            "pos_y":        stats.last_pos_y,
            "level":        stats.level,
            "strength":     stats.strength,
            "agility":      stats.agility,
            "intelligence": stats.intelligence,
            "vitality":     stats.vitality,
            "faction":      stats.faction,
            "character_class": stats.character_class,
            "race":         stats.race,
            "equipment_bonuses": bonuses,
            "passive_bonuses":   passive_bonuses,
            "skills":       skill_list,
            "party_id":     str(active_party.id) if active_party else None,
        }
        cache.set(f"game:player_state:{user.id}", state, timeout=3600)

    @staticmethod
    def _refresh_state_cache(user: User) -> None:
        """Schedule a cache refresh to run after the current transaction commits.
        Safe to call inside @transaction.atomic — the write only happens on success.
        """
        transaction.on_commit(lambda: GameLogicService.preload_player_state_to_redis(user))

    # ── Class / racial passive server_ids (mirrors game_data/0006 migration) ────
    _CLASS_PASSIVE_SERVER_ID: dict[str, int] = {
        "paladino":         101,
        "cavaleiro_dragao": 102,
        "mage":             103,
        "eldari":           104,
        "ignis":            105,
        "necromante":       106,
        "archer":           107,
        "shadow":           108,
    }
    _RACE_PASSIVE_SERVER_ID: dict[str, int] = {
        "humano":     201,
        "elfo":       202,
        "draconato":  203,
        "morto_vivo": 204,
    }

    # ── Starter skills granted at character creation (server_id → C# SkillRegistry) ─
    #
    #  1 = Power Strike   (melee single, ×2.5 phys)
    #  2 = Whirlwind      (melee AoE,   ×1.5 phys, 300 cm radius)
    #  3 = Arrow Rain     (ranged AoE,  ×1.2 phys, 250 cm radius, 800 range)
    #  4 = Piercing Shot  (ranged single, ×3.0 phys, 1000 range)
    #  5 = Fireball       (magic AoE,   ×2.0 mag,  200 cm radius, 700 range)
    #  6 = Ice Lance      (magic single, ×2.8 mag,  600 range)
    #  7 = Heal           (self, +40 HP)
    #  8 = Battle Cry     (self buff — Phase 3)
    _CLASS_STARTER_SKILLS: dict[str, list[int]] = {
        "paladino":         [1, 7, 8],   # Power Strike, Heal, Battle Cry
        "cavaleiro_dragao": [1, 2, 8],   # Power Strike, Whirlwind, Battle Cry
        "mage":             [5, 6],      # Fireball, Ice Lance
        "eldari":           [6, 7],      # Ice Lance, Heal
        "ignis":            [5, 8],      # Fireball, Battle Cry
        "necromante":       [6, 7],      # Ice Lance, Heal
        "archer":           [3, 4],      # Arrow Rain, Piercing Shot
        "shadow":           [1, 2],      # Power Strike, Whirlwind
    }

    # ── Base stats distributed per class role (total 40 attribute points) ──────
    _CLASS_BASE_STATS: dict[str, dict[str, int]] = {
        # Tanks: high VIT for HP/defense, STR for physical damage
        "paladino":         {"strength": 12, "agility": 8,  "intelligence": 6,  "vitality": 14},
        "cavaleiro_dragao": {"strength": 10, "agility": 8,  "intelligence": 10, "vitality": 12},
        # Magic DPS: heavy INT for spell damage and mana pool
        "mage":             {"strength": 5,  "agility": 10, "intelligence": 17, "vitality": 8},
        "eldari":           {"strength": 5,  "agility": 12, "intelligence": 17, "vitality": 6},
        "ignis":            {"strength": 5,  "agility": 10, "intelligence": 17, "vitality": 8},
        "necromante":       {"strength": 5,  "agility": 8,  "intelligence": 17, "vitality": 10},
        # Physical DPS
        "archer":           {"strength": 10, "agility": 16, "intelligence": 6,  "vitality": 8},
        "shadow":           {"strength": 12, "agility": 16, "intelligence": 4,  "vitality": 8},
    }

    @staticmethod
    def _compute_max_hp(vit: int) -> int:
        """Mirror of AttributeCalculator.MaxHp (no equip bonus at creation)."""
        return 100 + vit * 15

    @staticmethod
    def _compute_max_mana(intel: int) -> int:
        """Mirror of AttributeCalculator.MaxMana (no equip bonus at creation)."""
        return 50 + intel * 10

    @staticmethod
    @transaction.atomic
    def create_character(user: User, name: str, character_class: str, race: str, faction: str) -> Character:
        """Create a new character for a user with faction-based restrictions."""
        
        # ── Faction Restrictions Mapping ──
        FACTION_RULES = {
            "vanguarda": {
                "races": ["humano", "elfo"],
                "classes": ["paladino", "mage", "archer", "eldari"]
            },
            "legiao": {
                "races": ["draconato", "morto_vivo"],
                "classes": ["cavaleiro_dragao", "ignis", "shadow", "necromante"]
            }
        }

        if faction not in FACTION_RULES:
            raise ValueError(f"Facção '{faction}' inválida.")
        
        rules = FACTION_RULES[faction]
        
        if race not in rules["races"]:
            raise ValueError(f"A raça '{race}' não é permitida na facção {faction}.")
        
        if character_class not in rules["classes"]:
            raise ValueError(f"A classe '{character_class}' é exclusiva da outra facção.")

        if Character.objects.filter(name__iexact=name).exists():
            raise ValueError(f"O nome '{name}' já está em uso por outro herói.")

        # 1. Create the base Character
        character = Character.objects.create(
            owner=user,
            name=name,
            character_class=character_class,
            race=race,
            faction=faction
        )

        # 2. Setup Stats
        base = GameLogicService._CLASS_BASE_STATS[character_class]
        stats = PlayerStats.objects.create(
            character=character,
            strength=base["strength"],
            agility=base["agility"],
            intelligence=base["intelligence"],
            vitality=base["vitality"],
            max_health=GameLogicService._compute_max_hp(base["vitality"]),
            max_mana=GameLogicService._compute_max_mana(base["intelligence"]),
        )
        stats.health = stats.max_health
        stats.mana = stats.max_mana
        stats.save()

        # 3. Setup Inventory
        PlayerInventory.objects.create(character=character)

        # 4. Grant starter skills/passives
        GameLogicService.grant_starter_skills_to_char(character)
        GameLogicService._grant_passives_to_char(character)
        
        GameLogicService.preload_character_state_to_redis(character)
        return character

    @staticmethod
    def _grant_passives(user: User, character_class: str, race: str) -> None:
        """Grant the class passive and racial passive PlayerSkill records.

        Passives are always equipped (always active) and never appear in the
        active skill bar — they are identified by is_passive / is_racial_passive.
        """
        from apps.game_data.models import SkillTemplate
        server_ids = []
        cls_sid  = GameLogicService._CLASS_PASSIVE_SERVER_ID.get(character_class)
        race_sid = GameLogicService._RACE_PASSIVE_SERVER_ID.get(race)
        if cls_sid:  server_ids.append(cls_sid)
        if race_sid: server_ids.append(race_sid)
        if not server_ids:
            return
        templates = {
            t.server_id: t
            for t in SkillTemplate.objects.filter(server_id__in=server_ids)
        }
        for sid in server_ids:
            template = templates.get(sid)
            if template is None:
                logger.warning("_grant_passives: SkillTemplate server_id=%s not found", sid)
                continue
            PlayerSkill.objects.get_or_create(
                owner=user,
                skill_template=template,
                defaults={"current_level": 1, "is_equipped": True},
            )

    @staticmethod
    def compute_passive_bonuses(user: User) -> dict:
        """Accumulate all passive stat bonuses for a player.

        Reads every PlayerSkill whose SkillTemplate has is_passive=True or
        is_racial_passive=True, extracts level_scaling[current_level - 1],
        and returns a flat dict of summed bonuses ready for the game state.

        Effect keys match the C# PassiveBonuses DTO property names (snake_case):
          str, agi, int, vit,
          max_hp_pct, max_mana_pct,
          phys_damage_pct, mag_damage_pct,
          phys_defense_pct, mag_defense_pct,
          move_speed_pct, attack_range_pct
        """
        bonuses: dict[str, int] = {
            "str": 0, "agi": 0, "int": 0, "vit": 0,
            "max_hp_pct": 0,    "max_mana_pct": 0,
            "phys_damage_pct": 0, "mag_damage_pct": 0,
            "phys_defense_pct": 0, "mag_defense_pct": 0,
            "move_speed_pct": 0, "attack_range_pct": 0,
        }
        passives = PlayerSkill.objects.filter(owner=user).select_related("skill_template")
        for ps in passives:
            t = ps.skill_template
            if not (t.is_passive or t.is_racial_passive):
                continue
            scaling = t.level_scaling or []
            if not scaling:
                continue
            idx     = min(ps.current_level - 1, len(scaling) - 1)
            effects = scaling[max(0, idx)]
            for key in bonuses:
                bonuses[key] += int(effects.get(key, 0))
        return bonuses

    @staticmethod
    def grant_starter_skills(user: User, character_class: str) -> list[PlayerSkill]:
        """Create PlayerSkill records for each starter skill of the given class.

        Looks up SkillTemplate by server_id (the bridge to the C# SkillRegistry).
        Silently skips any server_id whose SkillTemplate row doesn't exist yet,
        so missing seeds never block character creation.
        """
        from apps.game_data.models import SkillTemplate
        server_ids = GameLogicService._CLASS_STARTER_SKILLS.get(character_class, [])
        templates  = {
            t.server_id: t
            for t in SkillTemplate.objects.filter(server_id__in=server_ids)
        }
        granted: list[PlayerSkill] = []
        for sid in server_ids:
            template = templates.get(sid)
            if template is None:
                logger.warning(
                    "grant_starter_skills: SkillTemplate with server_id=%s not found, skipping", sid
                )
                continue
            skill, _ = PlayerSkill.objects.get_or_create(
                owner=user,
                skill_template=template,
                defaults={"current_level": 1, "is_equipped": True, "slot_index": len(granted)},
            )
            granted.append(skill)
        return granted

    @staticmethod
    @transaction.atomic
    def apply_death_penalty(user: User) -> dict:
        """Deduct 10 % of current XP and 10 % of current gold on death.
        Neither stat can drop below 0; level is never reduced.
        Returns a dict with the actual amounts lost."""
        stats, _     = PlayerStats.objects.select_for_update().get_or_create(owner=user)
        inventory, _ = PlayerInventory.objects.select_for_update().get_or_create(owner=user)

        xp_lost   = max(1, stats.experience // 10)
        gold_lost = inventory.gold // 10

        stats.experience = max(0, stats.experience - xp_lost)
        stats.save(update_fields=["experience", "updated_at"])

        if gold_lost > 0:
            inventory.gold = max(0, inventory.gold - gold_lost)
            inventory.save(update_fields=["gold", "updated_at"])

        return {"xp_lost": xp_lost, "gold_lost": gold_lost}

    MAX_SKILL_LEVEL = 5
    UPGRADE_COST_PER_LEVEL = 100  # gold cost = current_level × this value

    @staticmethod
    @transaction.atomic
    def upgrade_skill(user: User, player_skill_id: str) -> PlayerSkill:
        """Manually upgrade a learned skill by spending gold.

        Cost: current_level × UPGRADE_COST_PER_LEVEL gold.
        Max level: MAX_SKILL_LEVEL.
        Passive skills cannot be upgraded this way.
        """
        from apps.game_data.models import SkillTemplate as _SkillTemplate
        try:
            skill = PlayerSkill.objects.select_for_update().get(id=player_skill_id, owner=user)
        except PlayerSkill.DoesNotExist:
            raise ValueError("Skill not found.")

        template = skill.skill_template
        if getattr(template, "is_passive", False) or getattr(template, "is_racial_passive", False):
            raise ValueError("Passive skills cannot be upgraded manually.")

        if skill.current_level >= GameLogicService.MAX_SKILL_LEVEL:
            raise ValueError(
                f"Skill is already at max level ({GameLogicService.MAX_SKILL_LEVEL})."
            )

        cost = skill.current_level * GameLogicService.UPGRADE_COST_PER_LEVEL
        inventory, _ = PlayerInventory.objects.select_for_update().get_or_create(owner=user)
        if inventory.gold < cost:
            raise ValueError(f"Insufficient gold. Need {cost}, have {inventory.gold}.")

        inventory.gold -= cost
        inventory.save(update_fields=["gold", "updated_at"])

        skill.current_level += 1
        skill.save(update_fields=["current_level", "updated_at"])
        GameLogicService._refresh_state_cache(user)
        return skill

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
        GameLogicService._refresh_state_cache(user)
        return player_skill

    # ── Party management ──────────────────────────────────────────────────────

    @staticmethod
    @transaction.atomic
    def create_party(leader: User) -> Party:
        """Create a new party with leader as the first member. Disbands any existing active party."""
        # Disband any party the user currently leads
        Party.objects.filter(leader=leader, is_active=True).update(is_active=False)
        # Leave any party the user is currently a member of
        PartyMember.objects.filter(user=leader, party__is_active=True).delete()

        party = Party.objects.create(leader=leader)
        PartyMember.objects.create(party=party, user=leader)
        GameLogicService._refresh_state_cache(leader)
        return party

    @staticmethod
    @transaction.atomic
    def invite_to_party(leader: User, invitee_id: str) -> Party:
        """Add a player to the leader's active party. Only the leader may invite."""
        party = Party.objects.select_for_update().get(leader=leader, is_active=True)

        if party.memberships.count() >= Party.MAX_SIZE:
            raise ValueError(f"Party is full (max {Party.MAX_SIZE} members).")

        try:
            invitee = User.objects.get(id=invitee_id)
        except User.DoesNotExist:
            raise ValueError("Player not found.")

        if invitee == leader:
            raise ValueError("Cannot invite yourself.")

        # Remove invitee from any current party first
        PartyMember.objects.filter(user=invitee, party__is_active=True).delete()

        PartyMember.objects.get_or_create(party=party, user=invitee)
        GameLogicService._refresh_state_cache(invitee)
        return party

    @staticmethod
    @transaction.atomic
    def leave_party(user: User) -> None:
        """Leave the current active party. Disbands the party if the leader leaves."""
        membership = (
            PartyMember.objects
            .select_for_update()
            .filter(user=user, party__is_active=True)
            .select_related("party")
            .first()
        )
        if not membership:
            return

        party = membership.party

        # Collect remaining members before deleting membership
        remaining = list(
            PartyMember.objects.filter(party=party)
            .exclude(user=user)
            .values_list("user", flat=True)
        )

        membership.delete()

        if party.leader == user:
            # Leader left — disband; clear party_id for all ex-members
            party.is_active = False
            party.save(update_fields=["is_active", "updated_at"])
            for member_id in remaining:
                try:
                    ex_member = User.objects.get(id=member_id)
                    GameLogicService._refresh_state_cache(ex_member)
                except User.DoesNotExist:
                    pass
        elif party.memberships.count() == 0:
            party.is_active = False
            party.save(update_fields=["is_active", "updated_at"])

        GameLogicService._refresh_state_cache(user)

    @staticmethod
    def get_active_party(user: User) -> Party | None:
        """Return the active party the user belongs to, or None."""
        return (
            Party.objects
            .filter(memberships__user=user, is_active=True)
            .prefetch_related("memberships__user")
            .first()
        )
