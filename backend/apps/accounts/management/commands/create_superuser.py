from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

User = get_user_model()

class Command(BaseCommand):
    help = 'Create superuser suporte'

    def handle(self, *args, **options):
        if User.objects.filter(email='suporte@ravenna.com').exists():
            self.stdout.write(self.style.WARNING('Superuser suporte already exists'))
        else:
            User.objects.create_superuser(
                email='suporte@ravenna.com',
                password='suporte123',
                username='suporte',
                first_name='Suporte',
                last_name='Ravenna'
            )
            self.stdout.write(self.style.SUCCESS('Successfully created superuser suporte'))
