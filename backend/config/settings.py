from pathlib import Path
from decouple import config, Csv
from datetime import timedelta
import os

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Quick-start development settings - unsuitable for production
SECRET_KEY = config('SECRET_KEY')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config('DEBUG', default=True, cast=bool)

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='*', cast=Csv())


# Application definition

INSTALLED_APPS = [
    "apps.core.admin_config.CustomAdminConfig",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.postgres",
    
    # Third Party
    "rest_framework",
    "rest_framework_simplejwt",
    "django_filters",
    "corsheaders",
    "drf_spectacular",
    "django_cleanup.apps.CleanupConfig", # Cleanup must be placed last (or after apps that use files) usually, but it's an app config. Check docs. Usage: INSTALLED_APPS += ['django_cleanup.apps.CleanupConfig']

    # Local Apps
    "apps.core",
    "apps.accounts",
    "apps.entities",
    "apps.articles",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",  # Static files serving
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "apps.core.middleware.ModuleMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"


import dj_database_url

# Database
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases

DATABASES = {
    "default": dj_database_url.config(
        default=config('DATABASE_URL', default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}"),
        conn_max_age=600
    )
}


# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

AUTHENTICATION_BACKENDS = [
    'apps.accounts.backends.EmailOrUsernameModelBackend',
    'django.contrib.auth.backends.ModelBackend',
]

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.2/howto/static-files/

STATIC_URL = "/static/"
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# CSRF
CSRF_TRUSTED_ORIGINS = config('CSRF_TRUSTED_ORIGINS', default="http://localhost:3000", cast=Csv())

# ============================================================================
# File Storage Configuration (Local vs MinIO/S3)
# ============================================================================
# 
# O ProjetoRavenna suporta dois modos de armazenamento:
# 1. Local: Arquivos salvos em MEDIA_ROOT (desenvolvimento)
# 2. MinIO: Arquivos salvos no MinIO (produção, S3-compatible)
#
# Para usar MinIO, configure USE_MINIO=True e as variáveis MINIO_* no .env
# Veja docs/MINIO_SETUP.md para documentação completa
# ============================================================================

USE_MINIO = config('USE_MINIO', cast=bool, default=False)

if USE_MINIO:
    # django-storages fornece o backend S3 para MinIO
    INSTALLED_APPS += ['storages']
    
    # Configuração moderna de storages (Django 4.2+)
    STORAGES = {
        "default": {
            "BACKEND": "apps.core.storage.MinIOStorage",
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
        },
    }
    
    # ========================================================================
    # MinIO Connection Settings
    # ========================================================================
    # Credenciais do MinIO (mesmas do MINIO_ROOT_USER e MINIO_ROOT_PASSWORD)
    AWS_ACCESS_KEY_ID = config('MINIO_ACCESS_KEY', default='minioadmin')
    AWS_SECRET_ACCESS_KEY = config('MINIO_SECRET_KEY', default='minioadmin')
    
    # Bucket onde os arquivos serão salvos
    AWS_STORAGE_BUCKET_NAME = config('MINIO_BUCKET_NAME', default='projetoravenna')
    
    # Endpoint interno do MinIO (dentro da rede Docker)
    # O Django usa esta URL para salvar arquivos
    AWS_S3_ENDPOINT_URL = config('MINIO_ENDPOINT', default='http://minio:9000')
    
    # MinIO em produção geralmente não usa SSL internamente (Cloudflare faz isso)
    AWS_S3_USE_SSL = config('MINIO_USE_SSL', cast=bool, default=False)
    
    # ========================================================================
    # MinIO-Specific Settings
    # ========================================================================
    # Não sobrescrever arquivos existentes (evita perda acidental)
    AWS_S3_FILE_OVERWRITE = False
    
    # Não usar query string auth (arquivos são públicos para leitura)
    AWS_QUERYSTRING_AUTH = False
    
    # MinIO requer s3v4 signature e path-style addressing
    AWS_S3_SIGNATURE_VERSION = 's3v4'
    AWS_S3_ADDRESSING_STYLE = 'path'
    
    # ========================================================================
    # Public URL Configuration
    # ========================================================================
    # Domínio público do MinIO (via Cloudflare Tunnel)
    # Exemplo: minio.projetoravenna.cloud
    # URLs geradas: https://minio.projetoravenna.cloud/projetoravenna/path/to/file
    MINIO_PUBLIC_DOMAIN = config('MINIO_PUBLIC_DOMAIN', default=None)
    
    if MINIO_PUBLIC_DOMAIN:
        # URLs públicas incluem o bucket no path
        # Formato: https://minio.projetoravenna.cloud/projetoravenna/articles/banners/file.webp
        AWS_S3_CUSTOM_DOMAIN = f"{MINIO_PUBLIC_DOMAIN}/{AWS_STORAGE_BUCKET_NAME}"
        AWS_S3_URL_PROTOCOL = 'https:'
    else:
        # Sem domínio público, usa endpoint interno (desenvolvimento)
        AWS_S3_CUSTOM_DOMAIN = None
        AWS_S3_URL_PROTOCOL = 'http:'
    
    # MEDIA_URL para compatibilidade (usado apenas se CUSTOM_DOMAIN não estiver configurado)
    if AWS_S3_CUSTOM_DOMAIN:
        MEDIA_URL = f"{AWS_S3_URL_PROTOCOL}//{AWS_S3_CUSTOM_DOMAIN}/"
    else:
        MEDIA_URL = f"{AWS_S3_ENDPOINT_URL}/{AWS_STORAGE_BUCKET_NAME}/"
else:
    STORAGES = {
        "default": {
            "BACKEND": "django.core.files.storage.FileSystemStorage",
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
        },
    }
    MEDIA_URL = '/media/'

# Sempre definir MEDIA_ROOT e STATIC_ROOT para garantir compatibilidade com bibliotecas
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# DJANGO-RESIZED Settings
DJANGORESIZED_DEFAULT_SIZE = [1920, 1080]
DJANGORESIZED_DEFAULT_QUALITY = 85
DJANGORESIZED_DEFAULT_KEEP_META = True
DJANGORESIZED_DEFAULT_FORCE_FORMAT = 'WEBP'
DJANGORESIZED_DEFAULT_FORMAT_EXTENSIONS = {'WEBP': ".webp"}
DJANGORESIZED_DEFAULT_NORMALIZE_ROTATION = True


# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# User Model
AUTH_USER_MODEL = 'accounts.CustomUser'

# CORS
# CORS_ALLOW_ALL_ORIGINS = True # Disabled in favor of specific origins for security
CORS_ALLOWED_ORIGINS = config('CORS_ALLOWED_ORIGINS', default="http://localhost:3000", cast=Csv())
CORS_ALLOW_CREDENTIALS = True

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'EXCEPTION_HANDLER': 'apps.core.exceptions.standard_exception_handler',
}

# Spectacular
SPECTACULAR_SETTINGS = {
    'TITLE': 'Modular ERP API',
    'DESCRIPTION': 'API for Modular ERP/SaaS',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
}

# JWT
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

# Proxy Configuration (Cloudflare)
# Important for correct HTTPS handling when behind a proxy
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

