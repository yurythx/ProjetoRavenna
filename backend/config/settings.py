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
CSRF_TRUSTED_ORIGINS = config('CSRF_TRUSTED_ORIGINS', default="http://localhost:3000,http://localhost:8000", cast=Csv())

# ============================================================================
# File Storage Configuration (MinIO / Local)
# ============================================================================

MAX_UPLOAD_SIZE = config('MAX_UPLOAD_SIZE', default=5 * 1024 * 1024, cast=int)

USE_MINIO = config('USE_MINIO', default=False, cast=bool)

if USE_MINIO:
    # MinIO Credentials & Config
    AWS_ACCESS_KEY_ID = config('MINIO_ROOT_USER', default='minioadmin')
    AWS_SECRET_ACCESS_KEY = config('MINIO_ROOT_PASSWORD', default='minioadmin')
    AWS_STORAGE_BUCKET_NAME = config('MINIO_BUCKET_NAME', default='projetoravenna')
    AWS_S3_ENDPOINT_URL = config('MINIO_ENDPOINT_URL', default='http://minio:9000') # Internal (Docker)
    MINIO_PUBLIC_DOMAIN = config('MINIO_PUBLIC_DOMAIN', default='localhost:9000') # External (Browser)

    # Boto3 Settings
    AWS_S3_REGION_NAME = 'us-east-1' # Required by boto3
    AWS_S3_SIGNATURE_VERSION = 's3v4'
    AWS_S3_FILE_OVERWRITE = False
    AWS_S3_VERIFY = False # Disable SSL verification for internal communication if needed
    
    # Determine protocol based on public domain (avoid forcing HTTPS on localhost)
    if 'localhost' in MINIO_PUBLIC_DOMAIN or '127.0.0.1' in MINIO_PUBLIC_DOMAIN:
        AWS_S3_URL_PROTOCOL = 'http:'
        AWS_S3_SECURE_URLS = False
    else:
        AWS_S3_URL_PROTOCOL = 'https:' # Force HTTPS for production
        AWS_S3_SECURE_URLS = True
    
    # Custom Domain for URLs (Cloudflare -> MinIO)
    # Append bucket name if not using virtual-host style (e.g. minio.domain/bucket/file)
    if 'localhost' in MINIO_PUBLIC_DOMAIN or '127.0.0.1' in MINIO_PUBLIC_DOMAIN or 'minio.projetoravenna.cloud' in MINIO_PUBLIC_DOMAIN:
        AWS_S3_CUSTOM_DOMAIN = f'{MINIO_PUBLIC_DOMAIN}/{AWS_STORAGE_BUCKET_NAME}'
    else:
        AWS_S3_CUSTOM_DOMAIN = MINIO_PUBLIC_DOMAIN
    
    STORAGES = {
        "default": {
            "BACKEND": "apps.core.storage.MinIOStorage",
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
        },
    }
else:
    # Local File System
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
CORS_ALLOWED_ORIGINS = config('CORS_ALLOWED_ORIGINS', default="http://localhost:3000,http://localhost:3000,http://localhost:8000,http://127.0.0.1:8000", cast=Csv())
CORS_ALLOW_CREDENTIALS = True

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'apps.accounts.authentication.CustomJWTAuthentication',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/day',
        'user': '1000/day',
        'uploads': '20/hour',  # Custom scope for file uploads
        'comments': '10/minute', # Custom scope for comments
        'analytics': '1000/hour', # High throughput for tracking
    },
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

# ============================================================================
# Cache Configuration (Redis)
# ============================================================================
REDIS_URL = config('REDIS_URL', default=None)

if REDIS_URL:
    CACHES = {
        "default": {
            "BACKEND": "django_redis.cache.RedisCache",
            "LOCATION": REDIS_URL,
            "OPTIONS": {
                "CLIENT_CLASS": "django_redis.client.DefaultClient",
            }
        }
    }
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        }
    }

# ============================================================================
# Email Configuration
# ============================================================================
EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@projetoravenna.com')

