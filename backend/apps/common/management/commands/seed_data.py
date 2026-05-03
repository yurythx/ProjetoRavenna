from django.core.management.base import BaseCommand
from apps.blog.models import Category as BlogCategory, Article
from apps.forum.models import Category as ForumCategory, Thread, Post
from django.contrib.auth import get_user_model
from django.utils.text import slugify
from django.utils import timezone

User = get_user_model()

class Command(BaseCommand):
    help = 'Popula o blog e o fórum com categorias, artigos e tópicos iniciais.'

    def handle(self, *args, **options):
        # Admin user for authoring
        admin = User.objects.filter(is_superuser=True).first()
        if not admin:
            self.stdout.write(self.style.WARNING("Nenhum administrador encontrado. Por favor, crie um superuser primeiro."))
            return

        # --- Blog Seeding ---
        blog_cats_data = [
            ("Patch Notes", "Atualizações técnicas e mudanças no balanceamento do jogo."),
            ("Lore & História", "Mergulhe nos contos e segredos do universo Ravenna."),
            ("Notícias", "Fique por dentro dos eventos e novidades da equipe."),
        ]

        self.stdout.write("Populando Blog...")
        blog_categories = {}
        for name, desc in blog_cats_data:
            cat, created = BlogCategory.objects.get_or_create(
                slug=slugify(name),
                defaults={'name': name, 'description': desc, 'is_active': True}
            )
            blog_categories[name] = cat
            if created:
                self.stdout.write(f"  + Categoria Blog '{name}' criada.")

        # Sample Article
        if not Article.objects.exists():
            Article.objects.create(
                title="Bem-vindo ao Novo Ravenna",
                slug=slugify("Bem-vindo ao Novo Ravenna"),
                content="<p>Estamos entusiasmados em apresentar o novo portal do herói e o sistema de multi-personagens.</p>",
                category=blog_categories["Notícias"],
                author=admin,
                status="published",
                is_active=True
            )
            self.stdout.write("  + Artigo de boas-vindas criado.")

        # --- Forum Seeding ---
        forum_cats_data = [
            ("Anúncios Oficiais", "Comunicados importantes da equipe Ravenna.", "📢"),
            ("Discussão Geral", "Espaço para conversar sobre qualquer assunto do jogo.", "⚔️"),
            ("Sugestões & Feedback", "Ajude-nos a forjar o futuro de Ravenna.", "💡"),
        ]

        self.stdout.write("\nPopulando Fórum...")
        forum_categories = {}
        for name, desc, icon in forum_cats_data:
            cat, created = ForumCategory.objects.get_or_create(
                slug=slugify(name),
                defaults={'name': name, 'description': desc, 'icon': icon}
            )
            forum_categories[name] = cat
            if created:
                self.stdout.write(f"  + Categoria Fórum '{name}' criada.")

        # Sample Thread
        if not Thread.objects.exists():
            thread = Thread.objects.create(
                title="Sugestões para novas classes?",
                slug=slugify("Sugestões para novas classes"),
                category=forum_categories["Sugestões & Feedback"],
                author=admin,
                is_active=True
            )
            Post.objects.create(
                thread=thread,
                author=admin,
                content="Quais classes vocês gostariam de ver no futuro de Ravenna? Deixem suas ideias abaixo!"
            )
            self.stdout.write("  + Tópico de sugestões criado.")

        self.stdout.write(self.style.SUCCESS('\nDados de Blog e Fórum populados com sucesso!'))
