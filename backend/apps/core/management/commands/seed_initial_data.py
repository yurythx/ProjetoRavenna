from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.articles.models import Category, Tag
from decouple import config

class Command(BaseCommand):
    help = 'Seeds initial data (Superuser, Categories, Tags)'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS("Starting data seeding..."))
        
        # 1. Create Superuser (suporte)
        User = get_user_model()
        username = config('SUPERUSER_NAME', default='suporte')
        email = config('SUPERUSER_EMAIL', default='suporte@projetoravenna.cloud')
        password = config('SUPERUSER_PASSWORD', default='suporte123')

        if not User.objects.filter(username=username).exists():
            User.objects.create_superuser(username=username, email=email, password=password, first_name='Suporte', last_name='Admin')
            self.stdout.write(self.style.SUCCESS(f"Superuser '{username}' created."))
        else:
            self.stdout.write(self.style.WARNING(f"Superuser '{username}' already exists."))

        # 1.5. Create Default Entity (White-Label)
        from apps.entities.models import Entity
        
        entity_domain = config('DEFAULT_ENTITY_DOMAIN', default='localhost')
        
        if not Entity.objects.filter(is_active=True).exists():
            entity = Entity.objects.create(
                name='Projeto Ravenna',
                domain=entity_domain,
                brand_name='Projeto Ravenna',
                primary_color='#44B78B',
                secondary_color='#2D3748',
                primary_color_dark='#44B78B',
                secondary_color_dark='#0C4B33',
                footer_text='Todos os direitos reservados.',
                is_active=True
            )
            self.stdout.write(self.style.SUCCESS(f"✅ Default Entity created: {entity.name} ({entity.domain})"))
        else:
            entity = Entity.objects.filter(is_active=True).first()
            # Update existing Entity to have correct domain
            if not entity.domain or entity.domain == 'localhost':
                entity.domain = entity_domain
                entity.brand_name = 'Projeto Ravenna'
                entity.save()
                self.stdout.write(self.style.SUCCESS(f"✅ Entity updated: {entity.name} -> domain: {entity.domain}"))
            else:
                self.stdout.write(self.style.WARNING(f"Entity already exists: {entity.name} ({entity.domain})"))

        # 2. Create Categories
        categories = ['Tecnologia', 'Noticias', 'Filmes', 'Animes', 'Programação']
        for cat_name in categories:
            cat, created = Category.objects.get_or_create(
                name=cat_name,
                defaults={'description': f'Artigos sobre {cat_name}'}
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"Category '{cat_name}' created."))
            else:
                self.stdout.write(self.style.WARNING(f"Category '{cat_name}' already exists."))

        # 3. Create Initial Tags
        tags = ['Python', 'Django', 'Next.js', 'React', 'Docker', 'DevOps', 'Tutorial']
        for tag_name in tags:
            tag, created = Tag.objects.get_or_create(
                name=tag_name,
                defaults={'color': '#3b82f6'} # Default blue
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"Tag '{tag_name}' created."))
            
        self.stdout.write(self.style.SUCCESS("Seeding completed successfully!"))
