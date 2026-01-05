from django.core.management.base import BaseCommand
import yaml
from drf_spectacular.generators import SchemaGenerator

class Command(BaseCommand):
    help = "Exports the OpenAPI schema to a file (default: schema.yaml) for TypeScript generation."

    def add_arguments(self, parser):
        parser.add_argument('--file', type=str, default='schema.yaml', help='Output file')

    def handle(self, *args, **options):
        # We can use the Spectacular internal command or just use the generator directly.
        # But 'python manage.py spectacular --file schema.yaml' is already a thing.
        # This is a wrapper to be consistent with the user's "Contract Layer" request.
        
        from django.core.management import call_command
        output_file = options['file']
        
        self.stdout.write(f"Generating OpenAPI schema to {output_file}...")
        call_command('spectacular', file=output_file)
        self.stdout.write(self.style.SUCCESS(f"Successfully generated {output_file}"))
        self.stdout.write("Now run 'npx openapi-typescript schema.yaml -o src/types/api.ts' in your frontend project.")
