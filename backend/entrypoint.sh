#!/bin/sh
set -e
export DJANGO_SETTINGS_MODULE=config.settings
python -c "import os; os.makedirs('staticfiles', exist_ok=True)"
python manage.py collectstatic --noinput || true
gunicorn config.wsgi:application --bind 0.0.0.0:8000
