"""
Management command to create sample admin data for testing
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.articles.models import Category, Tag, Article
from apps.entities.models import Entity, Address
from apps.core.models import AppModule

User = get_user_model()


class Command(BaseCommand):
    help = 'Create sample data for Django Admin testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before creating new samples',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write(self.style.WARNING('Clearing existing data...'))
            Article.objects.all().delete()
            Category.objects.all().delete()
            Tag.objects.all().delete()
            Entity.objects.all().delete()
            Address.objects.all().delete()
            # Don't delete AppModules as they might be system modules
            self.stdout.write(self.style.SUCCESS('Data cleared!'))

        self.stdout.write('Creating sample data...')

        # Create superuser if doesn't exist
        if not User.objects.filter(email='admin@example.com').exists():
            admin_user = User.objects.create_superuser(
                email='admin@example.com',
                username='admin',
                password='admin123',
                first_name='Admin',
                last_name='User'
            )
            self.stdout.write(self.style.SUCCESS(f'✓ Created superuser: {admin_user.email}'))
        else:
            admin_user = User.objects.get(email='admin@example.com')
            self.stdout.write(f'  Superuser already exists: {admin_user.email}')

        # Create regular users
        users = []
        for i in range(1, 4):
            email = f'user{i}@example.com'
            if not User.objects.filter(email=email).exists():
                user = User.objects.create_user(
                    email=email,
                    username=f'user{i}',
                    password='password123',
                    first_name=f'User{i}',
                    last_name='Test'
                )
                users.append(user)
                self.stdout.write(self.style.SUCCESS(f'✓ Created user: {user.email}'))
            else:
                users.append(User.objects.get(email=email))

        # Create Categories
        categories_data = [
            {'name': 'Technology', 'description': 'Tech articles and tutorials'},
            {'name': 'Business', 'description': 'Business insights and strategies'},
            {'name': 'Lifestyle', 'description': 'Lifestyle and wellness content'},
            {'name': 'Education', 'description': 'Educational resources'},
        ]
        
        categories = []
        for cat_data in categories_data:
            category, created = Category.objects.get_or_create(
                name=cat_data['name'],
                defaults={'description': cat_data['description']}
            )
            categories.append(category)
            status = '✓' if created else ' '
            self.stdout.write(self.style.SUCCESS(f'{status} Category: {category.name}'))

        # Create Tags
        tags_data = ['Python', 'Django', 'JavaScript', 'React', 'AI', 'Machine Learning', 
                     'Web Development', 'Mobile', 'Cloud', 'DevOps']
        
        tags = []
        for tag_name in tags_data:
            tag, created = Tag.objects.get_or_create(name=tag_name)
            tags.append(tag)
            status = '✓' if created else ' '
            self.stdout.write(self.style.SUCCESS(f'{status} Tag: {tag.name}'))

        # Create Articles
        articles_data = [
            {
                'title': 'Getting Started with Django Admin',
                'content': 'A comprehensive guide to customizing Django Admin...',
                'category': categories[0],
                'is_published': True,
                'tags': [tags[0], tags[1], tags[6]],
            },
            {
                'title': 'Advanced React Patterns',
                'content': 'Learn advanced React patterns for scalable applications...',
                'category': categories[0],
                'is_published': True,
                'tags': [tags[2], tags[3], tags[6]],
            },
            {
                'title': 'Business Strategy in 2026',
                'content': 'Key business strategies for the modern era...',
                'category': categories[1],
                'is_published': False,
                'tags': [],
            },
            {
                'title': 'Machine Learning Basics',
                'content': 'Introduction to machine learning concepts...',
                'category': categories[0],
                'is_published': True,
                'tags': [tags[0], tags[4], tags[5]],
            },
        ]

        for i, article_data in enumerate(articles_data):
            article_tags = article_data.pop('tags', [])
            article_data['author'] = users[i % len(users)]
            
            article, created = Article.objects.get_or_create(
                title=article_data['title'],
                defaults=article_data
            )
            
            if created and article_tags:
                article.tags.set(article_tags)
            
            status = '✓' if created else ' '
            pub_status = '📝 Published' if article.is_published else '📋 Draft'
            self.stdout.write(self.style.SUCCESS(
                f'{status} Article: {article.title} ({pub_status})'
            ))

        # Create Entities
        entities_data = [
            {
                'name': 'John Doe',
                'entity_type': 'PF',
                'tax_id': '123.456.789-00',
            },
            {
                'name': 'Tech Solutions Inc.',
                'entity_type': 'PJ',
                'tax_id': '12.345.678/0001-00',
            },
            {
                'name': 'Mary Johnson',
                'entity_type': 'PF',
                'tax_id': '987.654.321-00',
            },
        ]

        for entity_data in entities_data:
            entity, created = Entity.objects.get_or_create(
                name=entity_data['name'],
                defaults=entity_data
            )
            
            status = '✓' if created else ' '
            self.stdout.write(self.style.SUCCESS(f'{status} Entity: {entity.name} ({entity.entity_type})'))
            
            # Add address if created
            if created:
                Address.objects.create(
                    content_object=entity,
                    label='Main Office' if entity.entity_type == 'PJ' else 'Home',
                    street='Sample Street',
                    number='123',
                    district='Downtown',
                    city='São Paulo',
                    state='SP',
                    zip_code='01234-567'
                )
                self.stdout.write(f'  → Added address for {entity.name}')

        # Create AppModules
        modules_data = [
            {
                'name': 'Articles',
                'display_name': 'Articles Module',
                'is_active': True,
                'is_system_module': True,
            },
            {
                'name': 'Accounts',
                'display_name': 'User Management',
                'is_active': True,
                'is_system_module': True,
            },
            {
                'name': 'Reports',
                'display_name': 'Reporting Module',
                'is_active': False,
                'is_system_module': False,
            },
        ]

        for module_data in modules_data:
            module, created = AppModule.objects.get_or_create(
                name=module_data['name'],
                defaults=module_data
            )
            
            status = '✓' if created else ' '
            active_status = '🟢 Active' if module.is_active else '🔴 Inactive'
            system_status = '🔒 System' if module.is_system_module else '🔓 Regular'
            self.stdout.write(self.style.SUCCESS(
                f'{status} Module: {module.display_name} ({active_status}, {system_status})'
            ))

        self.stdout.write(self.style.SUCCESS('\n✅ Sample data created successfully!'))
        self.stdout.write('\n' + '='*60)
        self.stdout.write('Admin credentials:')
        self.stdout.write(f'  Email: admin@example.com')
        self.stdout.write(f'  Password: admin123')
        self.stdout.write('\nAccess admin at: http://localhost:8000/admin/')
        self.stdout.write('='*60)
