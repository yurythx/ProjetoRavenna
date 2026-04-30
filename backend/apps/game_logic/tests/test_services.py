"""
Tests for game_logic services.
"""
from django.test import TestCase

from apps.accounts.models import User
from apps.game_data.models import ItemTemplate, SkillTemplate
from apps.game_logic.models import PlayerItem, PlayerSkill, QuestProgress
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

    def test_start_and_complete_quest(self):
        progress = GameLogicService.start_quest(self.user, "quest_001")
        self.assertEqual(progress.status, "in_progress")

        completed = GameLogicService.complete_quest(self.user, "quest_001")
        self.assertEqual(completed.status, "completed")
        self.assertIsNotNone(completed.completed_at)

    def test_learn_skill_creates_and_levels_up(self):
        skill1 = GameLogicService.learn_skill(self.user, str(self.skill.id))
        self.assertEqual(skill1.current_level, 1)

        skill2 = GameLogicService.learn_skill(self.user, str(self.skill.id))
        self.assertEqual(skill2.id, skill1.id)
        self.assertEqual(skill2.current_level, 2)
