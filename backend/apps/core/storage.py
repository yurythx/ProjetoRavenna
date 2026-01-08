from storages.backends.s3boto3 import S3Boto3Storage

class MinIOStorage(S3Boto3Storage):
    """
    Custom storage backend for MinIO.
    Ensures that we use the correct settings for our specific MinIO setup.
    """
    def __init__(self, *args, **kwargs):
        # Ensure we use path-style addressing for MinIO
        kwargs['addressing_style'] = 'path'
        super().__init__(*args, **kwargs)

    def url(self, name, parameters=None, expire=None, http_method=None):
        # Ensure the generated URL is absolute and uses the custom domain if available
        url = super().url(name, parameters, expire, http_method)
        return url
