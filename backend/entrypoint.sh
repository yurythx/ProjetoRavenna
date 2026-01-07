#!/bin/sh

set -e

# Extract database host and port from DATABASE_URL
DB_HOST=${DATABASE_URL#*@}
DB_HOST=${DB_HOST%%/*}
DB_HOST=${DB_HOST%%:*}

# Wait for database to be ready
echo "Waiting for PostgreSQL at ${DB_HOST}..."
MAX_RETRIES=30
RETRY_COUNT=0

while ! nc -z ${DB_HOST} 5432; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "ERROR: PostgreSQL did not become ready in time"
    exit 1
  fi
  echo "PostgreSQL is unavailable - sleeping (attempt $RETRY_COUNT/$MAX_RETRIES)"
  sleep 2
done

echo "PostgreSQL is up - continuing..."

# Apply database migrations
echo "Applying database migrations..."
python manage.py migrate --noinput

# Configure Gunicorn workers (default: 3)
WORKERS=${GUNICORN_WORKERS:-3}
TIMEOUT=${GUNICORN_TIMEOUT:-120}

# Start server with proper logging
echo "Starting Gunicorn with $WORKERS workers..."
exec gunicorn config.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers $WORKERS \
  --timeout $TIMEOUT \
  --access-logfile - \
  --error-logfile - \
  --log-level info
