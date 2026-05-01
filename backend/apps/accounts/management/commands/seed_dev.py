from django.core.management.base import BaseCommand
from django.utils.text import slugify
from django.utils import timezone
from apps.accounts.models import User
from apps.blog.models import Category as BlogCategory, Post as BlogPost
from apps.forum.models import ForumCategory, Topic, Reply
from apps.game_data.models import ItemTemplate
from apps.game_logic.models import PlayerStats, PlayerInventory, QuestTemplate
from apps.game_logic.services import GameLogicService
import random

class Command(BaseCommand):
    help = 'Seeds the database with development data'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding data...')

        # 1. Create Superuser / Admin
        admin, created = User.objects.get_or_create(
            email='admin@ravenna.gg',
            defaults={
                'username': 'admin',
                'display_name': 'Grande Mestre',
                'is_staff': True,
                'is_superuser': True,
                'is_verified': True,
            }
        )
        if created:
            admin.set_password('admin123')
            admin.save()
            self.stdout.write(self.style.SUCCESS('Admin created: admin@ravenna.gg / admin123'))

        # 2. Create Blog Categories
        blog_cats_data = [
            ('Patch Notes', 'Notas de atualização e mudanças de balanceamento.'),
            ('Lore', 'Histórias e contos do universo de Ravenna.'),
            ('Eventos', 'Fique por dentro dos eventos temporários.'),
        ]
        blog_categories = []
        for name, desc in blog_cats_data:
            cat, _ = BlogCategory.objects.get_or_create(
                slug=slugify(name),
                defaults={'name': name, 'description': desc}
            )
            blog_categories.append(cat)

        # 3. Create Blog Posts
        if BlogPost.objects.count() < 5:
            for i in range(1, 6):
                post = BlogPost.objects.create(
                    title=f'Atualização do Servidor v1.{i}',
                    slug=f'patch-notes-v1-{i}',
                    excerpt=f'Resumo das principais mudanças da versão 1.{i}. Novos itens e balanceamento de classes.',
                    content=f'<h1>O que há de novo?</h1><p>Nesta atualização, focamos em melhorar a estabilidade e adicionar novos desafios.</p><ul><li>Novo boss: Dragão das Sombras</li><li>Ajuste de dano para Arqueiros</li><li>Correção de bugs na interface do fórum</li></ul>',
                    author=admin,
                    category=random.choice(blog_categories),
                    status=BlogPost.Status.PUBLISHED,
                    published_at=timezone.now(),
                    is_public=True
                )
            self.stdout.write(self.style.SUCCESS('Blog posts created'))

        # 4. Create Forum Categories
        forum_cats_data = [
            ('Estratégia', 'estrategia', 'Discussões sobre builds e guias.', '⚔'),
            ('Bug Report', 'bug-report', 'Relate erros encontrados no jogo.', '🐛'),
            ('Geral', 'geral', 'Bate-papo livre sobre qualquer assunto.', '💬'),
        ]
        forum_categories = []
        for name, slug, desc, icon in forum_cats_data:
            cat, _ = ForumCategory.objects.get_or_create(
                slug=slug,
                defaults={'name': name, 'description': desc, 'icon': icon}
            )
            forum_categories.append(cat)

        # 5. Create Forum Topics and Replies
        if Topic.objects.count() < 5:
            for i in range(1, 6):
                topic = Topic.objects.create(
                    title=f'Guia Completo para Iniciantes #{i}',
                    slug=f'guia-iniciantes-{i}',
                    content='Este é um guia básico para quem está começando sua jornada em Ravenna.',
                    author=admin,
                    category=random.choice(forum_categories),
                    last_reply_at=timezone.now()
                )
                Reply.objects.create(
                    content='Muito obrigado pelo guia, ajudou bastante!',
                    author=admin,
                    topic=topic
                )
                topic.increment_reply_count(admin)
            self.stdout.write(self.style.SUCCESS('Forum topics and replies created'))

        # 6. Create Item Templates
        items_data = [
            ('Espada de Ferro', 'Uma espada básica para guerreiros iniciantes.', 'weapon', 'common', 10, 0, 50),
            ('Escudo de Madeira', 'Proteção simples mas eficaz.', 'armor', 'common', 0, 5, 30),
            ('Poção de HP', 'Recupera 50 de vida.', 'consumable', 'common', 0, 0, 10),
            ('Cajado Arcano', 'Canaliza energia mágica pura.', 'weapon', 'rare', 25, 0, 500),
        ]
        for name, desc, itype, rarity, dmg, dfense, price in items_data:
            ItemTemplate.objects.get_or_create(
                name=name,
                defaults={
                    'description': desc,
                    'item_type': itype,
                    'rarity': rarity,
                    'base_damage': dmg,
                    'base_defense': dfense,
                    'price': price,
                    'icon_path': f'icons/{slugify(name)}.png'
                }
            )
        self.stdout.write(self.style.SUCCESS('Item templates created'))

        # 7. Create Quest Templates
        quests_data = [
            {
                "name": "O Início da Jornada",
                "quest_type": "main",
                "description": "Todo herói começa em algum lugar. Faça seu primeiro movimento no mundo de Ravenna.",
                "objectives": [{"key": "enter_world", "description": "Entre no servidor pela primeira vez", "target_count": 1}],
                "rewards": {"xp": 200, "gold": 50},
                "level_required": 1,
            },
            {
                "name": "Caçador de Lobos",
                "quest_type": "side",
                "description": "Os lobos das montanhas estão aterrorizando os aldeões. Elimine a ameaça.",
                "objectives": [{"key": "kill_wolf", "description": "Eliminar lobos das montanhas", "target_count": 5}],
                "rewards": {"xp": 500, "gold": 120},
                "level_required": 2,
            },
            {
                "name": "Treino Diário",
                "quest_type": "daily",
                "description": "Um guerreiro nunca para de treinar. Complete os exercícios do dia.",
                "objectives": [
                    {"key": "use_skill", "description": "Usar habilidades em combate", "target_count": 3},
                    {"key": "melee_attack", "description": "Realizar ataques corpo a corpo", "target_count": 10},
                ],
                "rewards": {"xp": 100, "gold": 30},
                "level_required": 1,
                "is_repeatable": True,
            },
            {
                "name": "Coletor de Recursos",
                "quest_type": "repeatable",
                "description": "Colete materiais raros espalhados pelo mapa.",
                "objectives": [{"key": "pickup_item", "description": "Coletar itens do chão", "target_count": 5}],
                "rewards": {"xp": 80, "gold": 20},
                "level_required": 1,
                "is_repeatable": True,
            },
            {
                "name": "A Maldição das Ruínas",
                "quest_type": "main",
                "description": "Uma força sombria desperta nas ruínas antigas a leste. Investigue a origem da maldição.",
                "objectives": [
                    {"key": "reach_ruins", "description": "Chegar às ruínas do leste", "target_count": 1},
                    {"key": "kill_cursed", "description": "Derrotar guardiões amaldiçoados", "target_count": 8},
                ],
                "rewards": {"xp": 1200, "gold": 300},
                "level_required": 5,
            },
        ]
        created_quests = 0
        for q in quests_data:
            _, c = QuestTemplate.objects.get_or_create(
                name=q["name"],
                defaults={
                    "quest_type": q["quest_type"],
                    "description": q["description"],
                    "objectives": q["objectives"],
                    "rewards": q["rewards"],
                    "level_required": q["level_required"],
                    "is_repeatable": q.get("is_repeatable", False),
                    "is_active": True,
                }
            )
            if c:
                created_quests += 1
        if created_quests:
            self.stdout.write(self.style.SUCCESS(f'{created_quests} quest templates created'))

        # 8. Ensure Admin has Stats and Inventory
        stats, _ = PlayerStats.objects.get_or_create(
            owner=admin,
            defaults={
                'level': 10,
                'experience': 5400,
                'strength': 25,
                'agility': 15,
                'intelligence': 10,
                'vitality': 20,
                'points_remaining': 5,
            }
        )
        GameLogicService.update_leaderboard_cache(admin, stats)
        PlayerInventory.objects.get_or_create(
            owner=admin,
            defaults={'gold': 1250, 'max_slots': 30}
        )
        self.stdout.write(self.style.SUCCESS('Admin player stats and inventory initialized'))

        self.stdout.write(self.style.SUCCESS('Database seeding completed!'))
