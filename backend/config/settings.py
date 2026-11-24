import os

SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'local-development-only-change-in-production')
DEBUG = os.getenv('DJANGO_DEBUG', 'true').lower() == 'true'
ALLOWED_HOSTS = os.getenv('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1,testserver').split(',')
ROOT_URLCONF = 'config.urls'
INSTALLED_APPS = ['corsheaders', 'routing']
MIDDLEWARE = ['django.middleware.security.SecurityMiddleware', 'corsheaders.middleware.CorsMiddleware', 'django.middleware.common.CommonMiddleware']
CORS_ALLOWED_ORIGINS = os.getenv('CORS_ALLOWED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173').split(',')
USE_TZ = True
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
CACHES = {'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache', 'LOCATION': 'forecast', 'TIMEOUT': 600, 'OPTIONS': {'MAX_ENTRIES': 1000}}}
