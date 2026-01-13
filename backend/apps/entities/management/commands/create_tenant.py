from django.core.management.base import BaseCommand, CommandError
from apps.entities.models import Entity


class Command(BaseCommand):
    help = 'Create a new Entity (Tenant) for white-label configuration'

    def add_arguments(self, parser):
        parser.add_argument('--name', type=str, required=True, help='Internal name of the entity')
        parser.add_argument('--domain', type=str, required=True, help='Domain or subdomain for this tenant')
        parser.add_argument('--brand-name', type=str, help='Public brand name (defaults to name)')
        parser.add_argument('--primary-color', type=str, default='#44B78B', help='Primary color (hex)')
        parser.add_argument('--secondary-color', type=str, default='#2D3748', help='Secondary color (hex)')
        parser.add_argument('--footer-text', type=str, default='', help='Footer text')

    def handle(self, *args, **options):
        name = options['name']
        domain = options['domain']
        brand_name = options.get('brand_name') or name
        primary_color = options['primary_color']
        secondary_color = options['secondary_color']
        footer_text = options['footer_text']

        # Check if domain already exists
        if Entity.objects.filter(domain=domain).exists():
            raise CommandError(f'Entity with domain "{domain}" already exists')

        # Create entity
        entity = Entity.objects.create(
            name=name,
            domain=domain,
            brand_name=brand_name,
            primary_color=primary_color,
            secondary_color=secondary_color,
            footer_text=footer_text,
            is_active=True,
        )

        self.stdout.write(
            self.style.SUCCESS(f'✅ Entity "{name}" created successfully!')
        )
        self.stdout.write(f'   Domain: {domain}')
        self.stdout.write(f'   Brand Name: {brand_name}')
        self.stdout.write(f'   Primary Color: {primary_color}')
        self.stdout.write(f'   ID: {entity.id}')
        self.stdout.write('')
        self.stdout.write(self.style.WARNING('Next steps:'))
        self.stdout.write('   1. Access your app at the configured domain')
        self.stdout.write('   2. Login as admin and go to /admin/branding to upload logo/favicon')
        self.stdout.write('   3. Reload the page to see the new branding')
