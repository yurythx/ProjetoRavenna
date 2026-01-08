# ProjetoRavenna - Quick Start Commands

## Development

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

## Database

# Create superuser
docker-compose exec backend python manage.py createsuperuser

# Run migrations
docker-compose exec backend python manage.py migrate

# Open Django shell
docker-compose exec backend python manage.py shell

# Access PostgreSQL
docker-compose exec db psql -U postgres projetoravenna_db

## MinIO

# Testar configuração do MinIO (recomendado)
docker-compose exec backend python manage.py test_minio
docker-compose exec backend python manage.py test_minio --check-bucket --test-upload

# Create bucket
docker-compose exec minio mc alias set myminio http://localhost:9000 minioadmin minioadmin
docker-compose exec minio mc mb myminio/projetoravenna
docker-compose exec minio mc anonymous set download myminio/projetoravenna

# Access MinIO Console
# http://localhost:9001

## Backup & Restore

# Backup database
docker-compose exec db pg_dump -U postgres projetoravenna_db > backup.sql

# Restore database
cat backup.sql | docker-compose exec -T db psql -U postgres projetoravenna_db

## Deployment

# Run automated deploy script
./deploy.sh

# Or manually:
docker-compose down
docker-compose build
docker-compose up -d
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py collectstatic --noinput

## Troubleshooting

# View container status
docker-compose ps

# View specific service logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs db
docker-compose logs minio

# Restart specific service
docker-compose restart backend

# Rebuild specific service
docker-compose build backend
docker-compose up -d backend

# Clean everything (⚠️ REMOVES ALL DATA)
docker-compose down -v

# Check health
docker-compose ps
docker inspect projetoravenna_backend | grep -A 10 Health

## Monitoring

# Real-time resource usage
docker stats

# Disk usage
docker system df -v

# Clean unused resources
docker system prune -a

## Cloudflare Tunnel

# The tunnel should point to:
# projetoravenna.cloud -> http://localhost:3001
# api.projetoravenna.cloud -> http://localhost:8000
# minio.projetoravenna.cloud -> http://localhost:9001 (optional)
