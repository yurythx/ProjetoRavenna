"""
Tests for game_logic services.
"""
from django.test import TestCase

from apps.accounts.models import User
from apps.game_data.models import ItemTemplate, SkillTemplate
from apps.game_logic.models import PlayerInventory, PlayerItem, PlayerSkill, PlayerStats, QuestProgress, QuestTemplate
from apps.game_logic.services import GameLogicService


class GameLogicServiceTestCase(TestCase):
    """Test cases for GameLogicService."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="user@example.com",
            username="user",
            password="TestPass123!"
        )
        self.stackable_item = ItemTemplate.objects.create(
            name="Health Potion",
            item_type="consumable",
            rarity="common",
            stack_size=10,
        )
        self.non_stackable_item = ItemTemplate.objects.create(
            name="Iron Sword",
            item_type="weapon",
            rarity="common",
            stack_size=1,
        )
        self.skill = SkillTemplate.objects.create(
            name="Fireball",
            skill_type="magic",
            damage=25,
            mana_cost=10,
            cooldown=3.0,
        )

    def test_get_or_create_player_instances(self):
        instances = GameLogicService.get_or_create_player_instances(self.user)
        self.assertIn("inventory", instances)
        self.assertIn("stats", instances)
        self.assertEqual(instances["inventory"].owner, self.user)
        self.assertEqual(instances["stats"].owner, self.user)

    def test_add_non_stackable_item_adds_slot(self):
        inventory = GameLogicService.add_item_to_inventory(self.user, str(self.non_stackable_item.id), quantity=1)
        self.assertEqual(inventory.slots_used, 1)
        items = PlayerItem.objects.filter(inventory=inventory).order_by("slot_index")
        self.assertEqual(items.count(), 1)
        self.assertEqual(items.first().slot_index, 0)
        self.assertEqual(str(items.first().item_template_id), str(self.non_stackable_item.id))
        self.assertEqual(items.first().quantity, 1)

    def test_add_stackable_item_stacks_in_one_slot(self):
        inventory = GameLogicService.add_item_to_inventory(self.user, str(self.stackable_item.id), quantity=3)
        inventory = GameLogicService.add_item_to_inventory(self.user, str(self.stackable_item.id), quantity=4)
        self.assertEqual(inventory.slots_used, 1)
        items = PlayerItem.objects.filter(inventory=inventory).order_by("slot_index")
        self.assertEqual(items.count(), 1)
        self.assertEqual(items.first().quantity, 7)

    def test_add_stackable_item_overflows_to_second_slot(self):
        inventory = GameLogicService.add_item_to_inventory(self.user, str(self.stackable_item.id), quantity=12)
        self.assertEqual(inventory.slots_used, 2)
        items = list(PlayerItem.objects.filter(inventory=inventory).order_by("slot_index"))
        self.assertEqual(len(items), 2)
        self.assertEqual(items[0].quantity, 10)
        self.assertEqual(items[1].quantity, 2)

    def test_remove_item_invalid_index_raises_error(self):
        GameLogicService.add_item_to_inventory(self.user, str(self.non_stackable_item.id), quantity=1)
        with self.assertRaises(ValueError):
            GameLogicService.remove_item_from_inventory(self.user, 5)

    def test_update_player_stats_clamps_health_and_mana(self):
        instances = GameLogicService.get_or_create_player_instances(self.user)
        stats = instances["stats"]
        stats.max_health = 100
        stats.max_mana = 50
        stats.save()

        updated = GameLogicService.update_player_stats(self.user, {"health": 999, "mana": 999})
        self.assertEqual(updated.health, 100)
        self.assertEqual(updated.mana, 50)

    def test_update_player_stats_negative_raises_error(self):
        with self.assertRaises(ValueError):
            GameLogicService.update_player_stats(self.user, {"health": -1})

    def test_gain_experience_levels_up_and_grants_points(self):
        stats = GameLogicService.gain_experience(self.user, 250)
        self.assertEqual(stats.level, 3)
        self.assertEqual(stats.experience, 50)
        self.assertEqual(stats.points_remaining, 10)

    def test_allocate_points_consumes_points(self):
        stats = GameLogicService.gain_experience(self.user, 100)
        self.assertEqual(stats.points_remaining, 5)

        updated = GameLogicService.allocate_points(self.user, {"strength": 2, "vitality": 3})
        self.assertEqual(updated.points_remaining, 0)
        self.assertEqual(updated.strength, 12)
        self.assertEqual(updated.vitality, 13)

    def test_start_and_complete_quest_no_template(self):
        """String quest_ids with no matching template complete cleanly with no rewards."""
        progress = GameLogicService.start_quest(self.user, "quest_001")
        self.assertEqual(progress.status, "in_progress")

        completed = GameLogicService.complete_quest(self.user, "quest_001")
        self.assertEqual(completed.status, "completed")
        self.assertIsNotNone(completed.completed_at)

    def test_complete_quest_delivers_xp_rewards(self):
        template = QuestTemplate.objects.create(
            name="Kill 5 Wolves",
            quest_type="side",
            rewards={"xp": 250},
            level_required=1,
        )
        GameLogicService.start_quest(self.user, str(template.id))
        GameLogicService.complete_quest(self.user, str(template.id))

        stats = PlayerStats.objects.get(owner=self.user)
        # 250 XP → level 3 (100 per level) + 50 remaining
        self.assertEqual(stats.level, 3)
        self.assertEqual(stats.experience, 50)

    def test_complete_quest_delivers_gold_rewards(self):
        template = QuestTemplate.objects.create(
            name="Gather Resources",
            quest_type="side",
            rewards={"gold": 500},
            level_required=1,
        )
        GameLogicService.start_quest(self.user, str(template.id))
        GameLogicService.complete_quest(self.user, str(template.id))

        inventory = PlayerInventory.objects.get(owner=self.user)
        self.assertEqual(inventory.gold, 500)

    def test_complete_quest_delivers_item_rewards(self):
        template = QuestTemplate.objects.create(
            name="Hero's Trial",
            quest_type="main",
            rewards={"items": [{"item_template_id": str(self.non_stackable_item.id), "quantity": 1}]},
            level_required=1,
        )
        GameLogicService.start_quest(self.user, str(template.id))
        GameLogicService.complete_quest(self.user, str(template.id))

        inventory = PlayerInventory.objects.get(owner=self.user)
        self.assertEqual(inventory.slots_used, 1)
        self.assertEqual(PlayerItem.objects.filter(inventory=inventory).count(), 1)

    def test_complete_quest_repeatable_resets_status(self):
        template = QuestTemplate.objects.create(
            name="Daily Hunt",
            quest_type="daily",
            rewards={"xp": 50},
            level_required=1,
            is_repeatable=True,
        )
        GameLogicService.start_quest(self.user, str(template.id))
        progress = GameLogicService.complete_quest(self.user, str(template.id))

        self.assertEqual(progress.status, "in_progress")
        self.assertIsNone(progress.completed_at)

    def test_learn_skill_creates_and_levels_up(self):
        skill1 = GameLogicService.learn_skill(self.user, str(self.skill.id))
        self.assertEqual(skill1.current_level, 1)

        skill2 = GameLogicService.learn_skill(self.user, str(self.skill.id))
        self.assertEqual(skill2.id, skill1.id)
        self.assertEqual(skill2.current_level, 2)

    def test_upgrade_skill_deducts_gold_and_levels_up(self):
        ps = PlayerSkill.objects.create(owner=self.user, skill_template=self.skill, current_level=1)
        inv, _ = PlayerInventory.objects.get_or_create(owner=self.user)
        inv.gold = 500
        inv.save()

        upgraded = GameLogicService.upgrade_skill(self.user, str(ps.id))
        self.assertEqual(upgraded.current_level, 2)
        inv.refresh_from_db()
        self.assertEqual(inv.gold, 400)  # cost = 1 * 100

    def test_upgrade_skill_fails_without_gold(self):
        ps = PlayerSkill.objects.create(owner=self.user, skill_template=self.skill, current_level=1)
        inv, _ = PlayerInventory.objects.get_or_create(owner=self.user)
        inv.gold = 50
        inv.save()

        with self.assertRaises(ValueError, msg="Insufficient gold"):
            GameLogicService.upgrade_skill(self.user, str(ps.id))

    def test_upgrade_skill_respects_max_level(self):
        ps = PlayerSkill.objects.create(
            owner=self.user, skill_template=self.skill,
            current_level=GameLogicService.MAX_SKILL_LEVEL
        )
        inv, _ = PlayerInventory.objects.get_or_create(owner=self.user)
        inv.gold = 9999
        inv.save()

        with self.assertRaises(ValueError, msg="already at max level"):
            GameLogicService.upgrade_skill(self.user, str(ps.id))

    def test_upgrade_skill_not_found_raises(self):
        import uuid
        with self.assertRaises(ValueError):
            GameLogicService.upgrade_skill(self.user, str(uuid.uuid4()))


# ── Equip / Unequip ──────────────────────────────────────────────────────────

class EquipItemServiceTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="eq@example.com", username="equser", password="TestPass123!"
        )
        from apps.game_data.models import ItemTemplate as IT
        self.sword = IT.objects.create(
            name="Iron Sword", item_type="weapon", rarity="common",
            stack_size=1, equip_slot="weapon", weapon_type="sword",
            base_phys_damage=10,
        )
        self.staff = IT.objects.create(
            name="Oak Staff", item_type="weapon", rarity="common",
            stack_size=1, equip_slot="weapon", weapon_type="staff",
            is_two_handed=True, base_mag_damage=15,
        )
        self.shield = IT.objects.create(
            name="Iron Shield", item_type="offhand", rarity="common",
            stack_size=1, equip_slot="offhand", weapon_type="shield",
            base_phys_defense=8,
        )
        self.helmet = IT.objects.create(
            name="Iron Helmet", item_type="helmet", rarity="common",
            stack_size=1, equip_slot="helmet", armor_type="heavy",
        )
        self.material = IT.objects.create(
            name="Wolf Fang", item_type="material", rarity="common", stack_size=20,
        )
        self.inventory, _ = PlayerInventory.objects.get_or_create(owner=self.user)

    def _add_item(self, template):
        return PlayerItem.objects.create(
            inventory=self.inventory, item_template=template,
            quantity=1, slot_index=PlayerItem.objects.filter(inventory=self.inventory).count(),
        )

    def _set_class(self, cls):
        stats, _ = PlayerStats.objects.get_or_create(owner=self.user)
        stats.character_class = cls
        stats.save(update_fields=["character_class", "updated_at"])

    def test_shadow_equips_sword_in_weapon_slot(self):
        self._set_class("shadow")
        pi = self._add_item(self.sword)
        result = GameLogicService.equip_item(self.user, str(pi.id), "weapon")
        self.assertEqual(result.equip_slot, "weapon")

    def test_mage_cannot_equip_sword(self):
        self._set_class("mage")
        pi = self._add_item(self.sword)
        with self.assertRaises(ValueError, msg="class restriction"):
            GameLogicService.equip_item(self.user, str(pi.id), "weapon")

    def test_mage_cannot_equip_shield(self):
        self._set_class("mage")
        pi = self._add_item(self.shield)
        with self.assertRaises(ValueError):
            GameLogicService.equip_item(self.user, str(pi.id), "offhand")

    def test_paladino_equips_shield_in_offhand(self):
        self._set_class("paladino")
        pi = self._add_item(self.shield)
        result = GameLogicService.equip_item(self.user, str(pi.id), "offhand")
        self.assertEqual(result.equip_slot, "offhand")

    def test_non_equippable_item_raises(self):
        pi = self._add_item(self.material)
        with self.assertRaises(ValueError):
            GameLogicService.equip_item(self.user, str(pi.id), "weapon")

    def test_two_handed_sword_clears_offhand(self):
        self._set_class("shadow")
        dagger = __import__("apps.game_data.models", fromlist=["ItemTemplate"]).ItemTemplate.objects.create(
            name="Dagger", item_type="weapon", rarity="common",
            stack_size=1, equip_slot="weapon", weapon_type="dagger",
        )
        offhand_item = self._add_item(dagger)
        offhand_item.equip_slot = "offhand"
        offhand_item.save(update_fields=["equip_slot", "updated_at"])

        two_h = __import__("apps.game_data.models", fromlist=["ItemTemplate"]).ItemTemplate.objects.create(
            name="Great Staff", item_type="weapon", rarity="rare",
            stack_size=1, equip_slot="weapon", weapon_type="sword",
            is_two_handed=True,
        )
        self._set_class("shadow")
        main_item = self._add_item(two_h)
        GameLogicService.equip_item(self.user, str(main_item.id), "weapon")

        offhand_item.refresh_from_db()
        self.assertEqual(offhand_item.equip_slot, "")

    def test_paladino_equips_heavy_helmet(self):
        self._set_class("paladino")
        pi = self._add_item(self.helmet)
        result = GameLogicService.equip_item(self.user, str(pi.id), "helmet")
        self.assertEqual(result.equip_slot, "helmet")

    def test_mage_cannot_equip_heavy_helmet(self):
        self._set_class("mage")
        pi = self._add_item(self.helmet)
        with self.assertRaises(ValueError):
            GameLogicService.equip_item(self.user, str(pi.id), "helmet")

    def test_equipping_same_slot_replaces_previous(self):
        self._set_class("shadow")
        sword1 = self._add_item(self.sword)
        sword2_template = __import__("apps.game_data.models", fromlist=["ItemTemplate"]).ItemTemplate.objects.create(
            name="Steel Sword", item_type="weapon", rarity="uncommon",
            stack_size=1, equip_slot="weapon", weapon_type="sword",
        )
        sword2 = self._add_item(sword2_template)

        GameLogicService.equip_item(self.user, str(sword1.id), "weapon")
        GameLogicService.equip_item(self.user, str(sword2.id), "weapon")

        sword1.refresh_from_db()
        sword2.refresh_from_db()
        self.assertEqual(sword1.equip_slot, "")
        self.assertEqual(sword2.equip_slot, "weapon")

    def test_invalid_equip_slot_raises(self):
        pi = self._add_item(self.sword)
        with self.assertRaises(ValueError):
            GameLogicService.equip_item(self.user, str(pi.id), "invalid_slot")


class UnequipItemServiceTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="uneq@example.com", username="unequser", password="TestPass123!"
        )
        from apps.game_data.models import ItemTemplate as IT
        sword = IT.objects.create(
            name="Iron Sword", item_type="weapon", rarity="common",
            stack_size=1, equip_slot="weapon", weapon_type="sword",
        )
        self.inventory, _ = PlayerInventory.objects.get_or_create(owner=self.user)
        self.item = PlayerItem.objects.create(
            inventory=self.inventory, item_template=sword,
            quantity=1, slot_index=0, equip_slot="weapon",
        )

    def test_unequip_removes_equip_slot(self):
        GameLogicService.unequip_item(self.user, "weapon")
        self.item.refresh_from_db()
        self.assertEqual(self.item.equip_slot, "")

    def test_unequip_empty_slot_is_no_op(self):
        GameLogicService.unequip_item(self.user, "helmet")
        # no error raised

    def test_unequip_invalid_slot_raises(self):
        with self.assertRaises(ValueError):
            GameLogicService.unequip_item(self.user, "bad_slot")


# ── Create Character ─────────────────────────────────────────────────────────

class CreateCharacterServiceTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="char@example.com", username="charuser", password="TestPass123!"
        )

    def test_mage_stats_applied_correctly(self):
        stats = GameLogicService.create_character(self.user, "mage", "elfo", "vanguarda")
        self.assertEqual(stats.character_class, "mage")
        self.assertEqual(stats.intelligence, 17)
        self.assertEqual(stats.strength, 5)
        self.assertEqual(stats.max_health, 100 + 8 * 15)   # vit=8 → 220
        self.assertEqual(stats.max_mana,   50 + 17 * 10)   # int=17 → 220
        self.assertEqual(stats.health, stats.max_health)
        self.assertEqual(stats.mana,   stats.max_mana)

    def test_paladino_stats_applied_correctly(self):
        stats = GameLogicService.create_character(self.user, "paladino", "humano", "vanguarda")
        self.assertEqual(stats.vitality, 14)
        self.assertEqual(stats.max_health, 100 + 14 * 15)  # 310
        self.assertEqual(stats.max_mana,   50 + 6 * 10)    # 110

    def test_faction_and_race_persisted(self):
        stats = GameLogicService.create_character(self.user, "archer", "draconato", "legiao")
        self.assertEqual(stats.race,    "draconato")
        self.assertEqual(stats.faction, "legiao")

    def test_double_creation_raises(self):
        GameLogicService.create_character(self.user, "mage", "elfo", "vanguarda")
        with self.assertRaises(ValueError, msg="already created"):
            GameLogicService.create_character(self.user, "archer", "humano", "legiao")

    def test_invalid_class_raises(self):
        with self.assertRaises(ValueError):
            GameLogicService.create_character(self.user, "wizard", "humano", "vanguarda")

    def test_invalid_race_raises(self):
        with self.assertRaises(ValueError):
            GameLogicService.create_character(self.user, "mage", "gnomo", "vanguarda")

    def test_invalid_faction_raises(self):
        with self.assertRaises(ValueError):
            GameLogicService.create_character(self.user, "mage", "elfo", "neutro")


# ── Party System ─────────────────────────────────────────────────────────────

class PartyServiceTestCase(TestCase):
    def setUp(self):
        self.leader = User.objects.create_user(
            email="leader@example.com", username="leader", password="TestPass123!"
        )
        self.member1 = User.objects.create_user(
            email="m1@example.com", username="m1", password="TestPass123!"
        )
        self.member2 = User.objects.create_user(
            email="m2@example.com", username="m2", password="TestPass123!"
        )

    def test_create_party_makes_leader_member(self):
        from apps.game_logic.models import Party, PartyMember
        party = GameLogicService.create_party(self.leader)
        self.assertTrue(party.is_active)
        self.assertEqual(party.leader, self.leader)
        self.assertEqual(PartyMember.objects.filter(party=party).count(), 1)
        self.assertTrue(PartyMember.objects.filter(party=party, user=self.leader).exists())

    def test_create_party_disbands_existing(self):
        from apps.game_logic.models import Party
        old = GameLogicService.create_party(self.leader)
        GameLogicService.create_party(self.leader)
        old.refresh_from_db()
        self.assertFalse(old.is_active)

    def test_invite_adds_member(self):
        from apps.game_logic.models import PartyMember
        party = GameLogicService.create_party(self.leader)
        GameLogicService.invite_to_party(self.leader, str(self.member1.id))
        self.assertEqual(PartyMember.objects.filter(party=party).count(), 2)

    def test_invite_self_raises(self):
        GameLogicService.create_party(self.leader)
        with self.assertRaises(ValueError, msg="Cannot invite yourself"):
            GameLogicService.invite_to_party(self.leader, str(self.leader.id))

    def test_invite_unknown_user_raises(self):
        import uuid
        GameLogicService.create_party(self.leader)
        with self.assertRaises(ValueError):
            GameLogicService.invite_to_party(self.leader, str(uuid.uuid4()))

    def test_invite_full_party_raises(self):
        from apps.game_logic.models import Party
        GameLogicService.create_party(self.leader)
        extras = [
            User.objects.create_user(
                email=f"extra{i}@example.com", username=f"extra{i}", password="TestPass123!"
            )
            for i in range(Party.MAX_SIZE - 1)
        ]
        for u in extras:
            GameLogicService.invite_to_party(self.leader, str(u.id))
        overflow = User.objects.create_user(
            email="overflow@example.com", username="overflow", password="TestPass123!"
        )
        with self.assertRaises(ValueError, msg="full"):
            GameLogicService.invite_to_party(self.leader, str(overflow.id))

    def test_member_can_leave(self):
        from apps.game_logic.models import PartyMember
        party = GameLogicService.create_party(self.leader)
        GameLogicService.invite_to_party(self.leader, str(self.member1.id))
        GameLogicService.leave_party(self.member1)
        self.assertFalse(PartyMember.objects.filter(party=party, user=self.member1).exists())
        party.refresh_from_db()
        self.assertTrue(party.is_active)  # leader is still there

    def test_leader_leave_disbands_party(self):
        from apps.game_logic.models import Party
        party = GameLogicService.create_party(self.leader)
        GameLogicService.invite_to_party(self.leader, str(self.member1.id))
        GameLogicService.leave_party(self.leader)
        party.refresh_from_db()
        self.assertFalse(party.is_active)

    def test_get_active_party_returns_none_when_not_in_party(self):
        self.assertIsNone(GameLogicService.get_active_party(self.leader))

    def test_get_active_party_returns_party(self):
        party = GameLogicService.create_party(self.leader)
        result = GameLogicService.get_active_party(self.leader)
        self.assertEqual(result.id, party.id)


# ── Death Penalty ────────────────────────────────────────────────────────────

class ApplyDeathPenaltyTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="dead@example.com", username="deaduser", password="TestPass123!"
        )

    def test_deducts_10_percent_xp(self):
        stats, _ = PlayerStats.objects.get_or_create(owner=self.user)
        stats.experience = 200
        stats.save(update_fields=["experience", "updated_at"])
        result = GameLogicService.apply_death_penalty(self.user)
        self.assertEqual(result["xp_lost"], 20)
        stats.refresh_from_db()
        self.assertEqual(stats.experience, 180)

    def test_deducts_10_percent_gold(self):
        inventory, _ = PlayerInventory.objects.get_or_create(owner=self.user)
        inventory.gold = 500
        inventory.save(update_fields=["gold", "updated_at"])
        result = GameLogicService.apply_death_penalty(self.user)
        self.assertEqual(result["gold_lost"], 50)
        inventory.refresh_from_db()
        self.assertEqual(inventory.gold, 450)

    def test_xp_floor_is_zero(self):
        stats, _ = PlayerStats.objects.get_or_create(owner=self.user)
        stats.experience = 0
        stats.save(update_fields=["experience", "updated_at"])
        GameLogicService.apply_death_penalty(self.user)
        stats.refresh_from_db()
        self.assertEqual(stats.experience, 0)

    def test_gold_not_negative(self):
        inventory, _ = PlayerInventory.objects.get_or_create(owner=self.user)
        inventory.gold = 0
        inventory.save(update_fields=["gold", "updated_at"])
        GameLogicService.apply_death_penalty(self.user)
        inventory.refresh_from_db()
        self.assertEqual(inventory.gold, 0)


# ── Equipment Bonuses ────────────────────────────────────────────────────────

class GetEquipmentBonusesTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="bonus@example.com", username="bonususer", password="TestPass123!"
        )

    def test_no_inventory_returns_zeros(self):
        bonuses = GameLogicService.get_equipment_bonuses(self.user)
        self.assertEqual(bonuses["phys_damage"], 0)
        self.assertEqual(bonuses["health"], 0)

    def test_equipped_weapon_adds_phys_damage(self):
        from apps.game_data.models import ItemTemplate as IT
        sword = IT.objects.create(
            name="Sword", item_type="weapon", rarity="common",
            stack_size=1, base_phys_damage=15,
        )
        inventory, _ = PlayerInventory.objects.get_or_create(owner=self.user)
        PlayerItem.objects.create(
            inventory=inventory, item_template=sword,
            quantity=1, slot_index=0, equip_slot="weapon",
        )
        bonuses = GameLogicService.get_equipment_bonuses(self.user)
        self.assertEqual(bonuses["phys_damage"], 15)

    def test_unequipped_item_does_not_count(self):
        from apps.game_data.models import ItemTemplate as IT
        sword = IT.objects.create(
            name="Sword", item_type="weapon", rarity="common",
            stack_size=1, base_phys_damage=15,
        )
        inventory, _ = PlayerInventory.objects.get_or_create(owner=self.user)
        PlayerItem.objects.create(
            inventory=inventory, item_template=sword,
            quantity=1, slot_index=0, equip_slot="",
        )
        bonuses = GameLogicService.get_equipment_bonuses(self.user)
        self.assertEqual(bonuses["phys_damage"], 0)

    def test_multiple_equipped_items_sum_bonuses(self):
        from apps.game_data.models import ItemTemplate as IT
        sword = IT.objects.create(
            name="Sword", item_type="weapon", rarity="common",
            stack_size=1, base_phys_damage=10, base_health=20,
        )
        helmet = IT.objects.create(
            name="Helmet", item_type="helmet", rarity="common",
            stack_size=1, base_phys_defense=5, base_health=30,
        )
        inventory, _ = PlayerInventory.objects.get_or_create(owner=self.user)
        PlayerItem.objects.create(
            inventory=inventory, item_template=sword,
            quantity=1, slot_index=0, equip_slot="weapon",
        )
        PlayerItem.objects.create(
            inventory=inventory, item_template=helmet,
            quantity=1, slot_index=1, equip_slot="helmet",
        )
        bonuses = GameLogicService.get_equipment_bonuses(self.user)
        self.assertEqual(bonuses["phys_damage"], 10)
        self.assertEqual(bonuses["phys_defense"], 5)
        self.assertEqual(bonuses["health"], 50)


# ── PvP Kill Record ──────────────────────────────────────────────────────────

class RecordPvpKillTestCase(TestCase):
    def setUp(self):
        self.killer = User.objects.create_user(
            email="killer@example.com", username="killer", password="TestPass123!"
        )
        self.victim = User.objects.create_user(
            email="victim@example.com", username="victim", password="TestPass123!"
        )
        PlayerStats.objects.get_or_create(owner=self.killer)
        PlayerStats.objects.get_or_create(owner=self.victim)

    def test_killer_pvp_kills_incremented(self):
        GameLogicService.record_pvp_kill(killer=self.killer, victim=self.victim)
        stats = PlayerStats.objects.get(owner=self.killer)
        self.assertEqual(stats.pvp_kills, 1)

    def test_victim_pvp_deaths_incremented(self):
        GameLogicService.record_pvp_kill(killer=self.killer, victim=self.victim)
        stats = PlayerStats.objects.get(owner=self.victim)
        self.assertEqual(stats.pvp_deaths, 1)

    def test_multiple_kills_accumulate(self):
        for _ in range(3):
            GameLogicService.record_pvp_kill(killer=self.killer, victim=self.victim)
        stats = PlayerStats.objects.get(owner=self.killer)
        self.assertEqual(stats.pvp_kills, 3)
