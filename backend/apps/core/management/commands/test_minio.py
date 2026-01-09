from django.core.management.base import BaseCommand
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
import boto3
from botocore.exceptions import ClientError
import uuid

class Command(BaseCommand):
    help = 'Test MinIO configuration and connectivity'

    def add_arguments(self, parser):
        parser.add_argument('--check-bucket', action='store_true', help='Check if bucket exists and has correct permissions')
        parser.add_argument('--test-upload', action='store_true', help='Try to upload a test file')
        parser.add_argument('--verbose', action='store_true', help='Show detailed output')

    def handle(self, *args, **options):
        verbose = options['verbose']
        
        self.stdout.write(self.style.SUCCESS('Checking MinIO Configuration...'))
        
        # 1. Check Settings
        use_minio = getattr(settings, 'USE_MINIO', False)
        if not use_minio:
            self.stdout.write(self.style.WARNING('USE_MINIO is False. Using default storage.'))
            self.stdout.write(f'Current Storage: {settings.STORAGES["default"]["BACKEND"]}')
            return

        endpoint = getattr(settings, 'AWS_S3_ENDPOINT_URL', None)
        access_key = getattr(settings, 'AWS_ACCESS_KEY_ID', None)
        secret_key = getattr(settings, 'AWS_SECRET_ACCESS_KEY', None)
        bucket_name = getattr(settings, 'AWS_STORAGE_BUCKET_NAME', None)

        if verbose:
            self.stdout.write(f'Endpoint: {endpoint}')
            self.stdout.write(f'Bucket: {bucket_name}')
            self.stdout.write(f'Access Key: {"*" * len(str(access_key)) if access_key else "None"}')

        if not all([endpoint, access_key, secret_key, bucket_name]):
            self.stdout.write(self.style.ERROR('Missing MinIO settings in settings.py'))
            return

        # 2. Check Connection
        try:
            s3 = boto3.client(
                's3',
                endpoint_url=endpoint,
                aws_access_key_id=access_key,
                aws_secret_access_key=secret_key,
                region_name='us-east-1',
                verify=False
            )
            s3.list_buckets()
            self.stdout.write(self.style.SUCCESS('✓ Connection to MinIO successful'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'✗ Failed to connect to MinIO: {str(e)}'))
            return

        # 3. Check Bucket
        if options['check_bucket']:
            try:
                s3.head_bucket(Bucket=bucket_name)
                self.stdout.write(self.style.SUCCESS(f'✓ Bucket "{bucket_name}" exists'))
                
                # Check permissions (basic check)
                policy_status = "Unknown"
                try:
                    policy = s3.get_bucket_policy_status(Bucket=bucket_name)
                    if policy.get('PolicyStatus', {}).get('IsPublic'):
                        policy_status = "Public"
                    else:
                        policy_status = "Private"
                except ClientError:
                    policy_status = "No Policy / Private"
                
                if verbose:
                    self.stdout.write(f'  Bucket Policy Status: {policy_status}')

            except ClientError as e:
                error_code = e.response['Error']['Code']
                if error_code == '404':
                    self.stdout.write(self.style.ERROR(f'✗ Bucket "{bucket_name}" does not exist'))
                else:
                    self.stdout.write(self.style.ERROR(f'✗ Error checking bucket: {str(e)}'))
                return

        # 4. Test Upload
        if options['test_upload']:
            filename = f'test_minio_{uuid.uuid4().hex}.txt'
            content = b'Hello from Django MinIO Test!'
            
            try:
                # Upload
                self.stdout.write(f'Attempting to upload {filename}...')
                path = default_storage.save(filename, ContentFile(content))
                self.stdout.write(self.style.SUCCESS(f'✓ Upload successful: {path}'))
                
                # URL Generation
                url = default_storage.url(path)
                self.stdout.write(self.style.SUCCESS(f'✓ URL generated: {url}'))
                
                # Read back
                with default_storage.open(path) as f:
                    read_content = f.read()
                    if read_content == content:
                        self.stdout.write(self.style.SUCCESS('✓ Read back successful'))
                    else:
                        self.stdout.write(self.style.ERROR('✗ Read back content mismatch'))

                # Delete
                default_storage.delete(path)
                self.stdout.write(self.style.SUCCESS('✓ Deletion successful'))
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'✗ Upload test failed: {str(e)}'))

        self.stdout.write(self.style.SUCCESS('MinIO check completed.'))
