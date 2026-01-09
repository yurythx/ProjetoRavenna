#!/bin/bash

# ProjetoRavenna - Deploy Script
# Este script automatiza o processo de deploy da aplicação

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 ProjetoRavenna - Deploy Script${NC}"
echo "=================================="

# Reminder to pull latest changes
echo -e "${BLUE}💡 Did you run 'git pull' to get the latest changes?${NC}"
read -p "Press Enter to continue or Ctrl+C to stop and run git pull..."


# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found!${NC}"
    echo "Please copy .env.example to .env and configure it first."
    exit 1
fi

# Load environment variables
set -a
source .env
set +a

# Validate required environment variables
echo -e "${BLUE}🔍 Validating environment variables...${NC}"
REQUIRED_VARS=("DJANGO_SECRET_KEY" "DB_PASSWORD" "MINIO_ROOT_USER" "MINIO_ROOT_PASSWORD")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    # Check if variable is set and not empty
    if [ -z "${!var}" ] || [ "${!var}" = "change-this-to-a-random-secret-key-in-production" ] || [ "${!var}" = "your-secure-postgres-password-here" ] || [ "${!var}" = "your-secure-minio-password-here" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo -e "${RED}❌ Error: Missing or invalid required environment variables:${NC}"
    printf '  - %s\n' "${MISSING_VARS[@]}"
    echo ""
    echo "Please configure these variables in your .env file."
    exit 1
fi

echo -e "${GREEN}✅ All required environment variables are set${NC}"

# Backup database
echo -e "${YELLOW}📦 Creating database backup...${NC}"
BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"

if docker-compose ps db | grep -q "Up"; then
    BACKUP_FILE="$BACKUP_DIR/backup_pre_deploy_$(date +%Y%m%d_%H%M%S).sql.gz"
    
    if docker-compose exec -T db pg_dump -U postgres projetoravenna_db | gzip > "$BACKUP_FILE"; then
        # Verify backup was created and has content
        if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
            BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
            echo -e "${GREEN}✅ Backup created: $BACKUP_FILE (${BACKUP_SIZE})${NC}"
            
            # Clean up old backups (keep last 7 days)
            echo -e "${BLUE}🧹 Cleaning up old backups (keeping last 7 days)...${NC}"
            find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +7 -delete 2>/dev/null || true
        else
            echo -e "${RED}❌ Backup file is empty or was not created!${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ Backup failed!${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Database not running, skipping backup${NC}"
fi

# Stop containers
echo -e "${YELLOW}⏸️  Stopping containers...${NC}"
docker-compose down

# Check disk space before building
echo -e "${BLUE}💾 Checking disk space...${NC}"
AVAILABLE_SPACE=$(df -BG . | tail -1 | awk '{print $4}' | sed 's/G//')
if [ "$AVAILABLE_SPACE" -lt 5 ]; then
    echo -e "${RED}❌ Warning: Less than 5GB available disk space!${NC}"
    echo "Available: ${AVAILABLE_SPACE}GB"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Build containers
echo -e "${YELLOW}🔨 Building containers (isso pode levar alguns minutos)...${NC}"
docker-compose build --no-cache

# Start containers
echo -e "${YELLOW}▶️  Starting containers...${NC}"
docker-compose up -d

# Wait for containers to be healthy
echo -e "${YELLOW}⏳ Waiting for containers to be healthy...${NC}"
sleep 20

# Check if backend is healthy
echo -e "${BLUE}🔍 Checking backend health...${NC}"
RETRIES=0
MAX_RETRIES=40
while [ $RETRIES -lt $MAX_RETRIES ]; do
    if docker-compose ps backend | grep -i -q "healthy"; then
        echo -e "${GREEN}✅ Backend is healthy${NC}"
        break
    fi
    echo "Waiting for backend... (attempt $((RETRIES+1))/$MAX_RETRIES)"
    sleep 2
    RETRIES=$((RETRIES+1))
done

if [ $RETRIES -eq $MAX_RETRIES ]; then
    echo -e "${RED}❌ Backend failed to become healthy${NC}"
    echo "Check logs with: docker-compose logs backend"
    exit 1
fi

# Check if frontend is healthy
echo -e "${BLUE}🔍 Checking frontend health...${NC}"
RETRIES=0
MAX_RETRIES=40
while [ $RETRIES -lt $MAX_RETRIES ]; do
    if docker-compose ps frontend | grep -i -q "healthy"; then
        echo -e "${GREEN}✅ Frontend is healthy${NC}"
        break
    fi
    echo "Waiting for frontend... (attempt $((RETRIES+1))/$MAX_RETRIES)"
    sleep 2
    RETRIES=$((RETRIES+1))
done

if [ $RETRIES -eq $MAX_RETRIES ]; then
    echo -e "${RED}❌ Frontend failed to become healthy${NC}"
    echo "Check logs with: docker-compose logs frontend"
    exit 1
fi

# Collect static files (removed from entrypoint.sh)
echo -e "${YELLOW}📁 Collecting static files...${NC}"
docker-compose exec -T backend python manage.py collectstatic --noinput

# Check status
echo -e "${YELLOW}📊 Container Status:${NC}"
docker-compose ps

echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Create superuser: docker-compose exec backend python manage.py createsuperuser"
echo "2. Configure Cloudflare Tunnel to point to:"
echo "   - projetoravenna.cloud -> http://localhost:3001 (Frontend)"
echo "   - api.projetoravenna.cloud -> http://localhost:8000 (Nginx/Backend)"
echo "   - minio.projetoravenna.cloud -> http://localhost:9002 (MinIO API)"
echo ""
echo "Access your application at:"
echo "- Frontend: https://projetoravenna.cloud"
echo "- Backend API: https://api.projetoravenna.cloud/api/v1/"
echo "- Admin: https://api.projetoravenna.cloud/admin/"
echo "- MinIO Console: http://localhost:9003"
echo ""
