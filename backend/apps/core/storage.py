"""
Custom storage backend for MinIO.

Este backend estende o S3Boto3Storage do django-storages para garantir
que as URLs sejam geradas corretamente com o domínio público do MinIO.

O django-storages automaticamente usa AWS_S3_CUSTOM_DOMAIN quando configurado
em settings.py, então esta classe serve principalmente como um ponto de
customização futuro se necessário.

Veja docs/MINIO_SETUP.md para documentação completa.
"""
from storages.backends.s3boto3 import S3Boto3Storage


class MinIOStorage(S3Boto3Storage):
    """
    Storage backend customizado para MinIO.
    
    Funcionalidades:
    - Gera URLs públicas usando AWS_S3_CUSTOM_DOMAIN
    - Compatível com path-style addressing do MinIO
    - Suporta domínio customizado via Cloudflare Tunnel
    
    Exemplo de URL gerada:
    https://minio.projetoravenna.cloud/projetoravenna/articles/banners/image.webp
    """
    pass
