#!/bin/sh

# Verify if we are waiting for DB (optional, but good practice)
# if [ "$DATABASE" = "postgres" ]
# then
#     echo "Waiting for postgres..."
#     while ! nc -z $SQL_HOST $SQL_PORT; do
#       sleep 0.1
#     done
#     echo "PostgreSQL started"
# fi

# Apply database migrations
echo "Applying database migrations..."
python manage.py migrate

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Start server
echo "Starting server..."
exec gunicorn config.wsgi:application --bind 0.0.0.0:8000
