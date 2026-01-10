import boto3
import json
from django.core.management.base import BaseCommand
from django.conf import settings
from botocore.client import Config

class Command(BaseCommand):
    help = 'Fix MinIO configuration: Bucket Policy (Public) and CORS'

    def handle(self, *args, **options):
        if not settings.USE_MINIO:
            self.stdout.write(self.style.WARNING("MinIO is not enabled in settings."))
            return

        self.stdout.write("Configuring MinIO...")

        s3 = boto3.client(
            's3',
            endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            config=Config(signature_version='s3v4'),
            region_name=settings.AWS_S3_REGION_NAME
        )

        bucket_name = settings.AWS_STORAGE_BUCKET_NAME

        # 1. Ensure Bucket Exists
        try:
            s3.head_bucket(Bucket=bucket_name)
            self.stdout.write(f"Bucket '{bucket_name}' exists.")
        except Exception:
            self.stdout.write(f"Creating bucket '{bucket_name}'...")
            s3.create_bucket(Bucket=bucket_name)

        # 2. Set Public Policy (Read-Only for Anonymous)
        policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Sid": "PublicRead",
                    "Effect": "Allow",
                    "Principal": "*",
                    "Action": ["s3:GetObject"],
                    "Resource": [f"arn:aws:s3:::{bucket_name}/*"]
                }
            ]
        }
        try:
            s3.put_bucket_policy(Bucket=bucket_name, Policy=json.dumps(policy))
            self.stdout.write(self.style.SUCCESS("✓ Bucket policy set to PUBLIC."))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"✗ Failed to set bucket policy: {e}"))

        # 3. Set CORS Configuration
        cors_config = {
            'CORSRules': [
                {
                    'AllowedHeaders': ['*'],
                    'AllowedMethods': ['GET', 'HEAD', 'PUT', 'POST', 'DELETE'],
                    'AllowedOrigins': ['*'],  # Allow all origins for development
                    'ExposeHeaders': ['ETag', 'x-amz-meta-custom-header'],
                    'MaxAgeSeconds': 3000
                }
            ]
        }
        try:
            s3.put_bucket_cors(Bucket=bucket_name, CORSConfiguration=cors_config)
            self.stdout.write(self.style.SUCCESS("✓ CORS configuration applied."))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"✗ Failed to set CORS: {e}"))

        self.stdout.write(self.style.SUCCESS("MinIO configuration completed!"))
