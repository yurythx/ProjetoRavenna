from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.articles.models import Category, Tag
from decouple import config
import boto3
from botocore.client import Config

class Command(BaseCommand):
    help = 'Seeds initial data (Superuser, Categories, Tags)'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS("Starting data seeding..."))
        
        # 0. Create MinIO Bucket if using MinIO
        use_minio = config('USE_MINIO', cast=bool, default=False)
        if use_minio:
            self.stdout.write("Checking MinIO bucket...")
            try:
                endpoint = config('MINIO_ENDPOINT', default='http://minio:9000')
                access_key = config('MINIO_ACCESS_KEY', default='minioadmin')
                secret_key = config('MINIO_SECRET_KEY', default='minioadmin')
                bucket_name = config('MINIO_BUCKET_NAME', default='projetoravenna')
                
                s3 = boto3.resource(
                    's3',
                    endpoint_url=endpoint,
                    aws_access_key_id=access_key,
                    aws_secret_access_key=secret_key,
                    config=Config(signature_version='s3v4'),
                    region_name='us-east-1' # Default for MinIO
                )
                
                bucket = s3.Bucket(bucket_name)
                if not bucket.creation_date:
                    self.stdout.write(f"Creating bucket '{bucket_name}'...")
                    bucket.create()
                    
                    # Set public policy for the bucket
                    import json
                    policy = {
                        "Version": "2012-10-17",
                        "Statement": [
                            {
                                "Effect": "Allow",
                                "Principal": {"AWS": ["*"]},
                                "Action": ["s3:GetBucketLocation", "s3:ListBucket"],
                                "Resource": [f"arn:aws:s3:::{bucket_name}"]
                            },
                            {
                                "Effect": "Allow",
                                "Principal": {"AWS": ["*"]},
                                "Action": ["s3:GetObject"],
                                "Resource": [f"arn:aws:s3:::{bucket_name}/*"]
                            }
                        ]
                    }
                    bucket.Policy().put(Policy=json.dumps(policy))
                    self.stdout.write(self.style.SUCCESS(f"Bucket '{bucket_name}' created with public policy."))
                else:
                    self.stdout.write(self.style.SUCCESS(f"Bucket '{bucket_name}' already exists."))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error initializing MinIO: {str(e)}"))
        
        # 1. Create Superuser (suporte)
        User = get_user_model()
        username = config('SUPERUSER_NAME', default='suporte')
        email = config('SUPERUSER_EMAIL', default='suporte@projetoravenna.cloud')
        password = config('SUPERUSER_PASSWORD', default='suporte123')

        if not User.objects.filter(username=username).exists():
            User.objects.create_superuser(username=username, email=email, password=password)
            self.stdout.write(self.style.SUCCESS(f"Superuser '{username}' created."))
        else:
            self.stdout.write(self.style.WARNING(f"Superuser '{username}' already exists."))

        # 2. Create Categories
        categories = ['Tecnologia', 'Noticias', 'Filmes', 'Animes']
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
