from storages.backends.s3boto3 import S3Boto3Storage

class MinIOStorage(S3Boto3Storage):
    """
    Custom Storage for MinIO to ensure correct handling of media files.
    """
    location = ''
    file_overwrite = False
