#!/bin/bash

# ProjetoRavenna - Deploy Script
# Este script automatiza o processo de deploy da aplicação

set -e  # Exit on error
set -o pipefail
shopt -s expand_aliases
on_error() {
  echo -e "${RED}❌ Ocorreu um erro durante o deploy${NC}"
  echo -e "${BLUE}ℹ️  Estado atual dos serviços:${NC}"
  docker-compose ps || true
  echo -e "${BLUE}🔎 Últimas linhas de logs (backend e frontend):${NC}"
  docker-compose logs --tail=50 backend || true
  docker-compose logs --tail=50 frontend || true
}
trap on_error ERR

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 ProjetoRavenna - Deploy Script${NC}"
echo "=================================="

if ! command -v docker-compose >/dev/null 2>&1; then
    if docker compose version >/dev/null 2>&1; then
        docker_compose() { docker compose "$@"; }
        alias docker-compose=docker_compose
        echo -e "${YELLOW}⚠️  Usando 'docker compose' como fallback para 'docker-compose'${NC}"
    else
        echo -e "${RED}❌ docker-compose não encontrado${NC}"
        echo "Instale o Docker Compose ou use 'docker compose' conforme sua instalação."
        exit 1
    fi
fi

# HTTP check helper (curl or wget)
http_ok() {
    local url="$1"
    if command -v curl >/dev/null 2>&1; then
        curl -sSf -o /dev/null "$url"
    elif command -v wget >/dev/null 2>&1; then
        wget --spider -q "$url"
    else
        echo -e "${YELLOW}⚠️  Nem curl nem wget estão instalados; pulando checagens HTTP${NC}"
        return 0
    fi
}

# Reminder to pull latest changes
echo -e "${BLUE}💡 Did you run 'git pull' to get the latest changes?${NC}"
read -p "Press Enter to continue or Ctrl+C to stop and run git pull..."


# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found!${NC}"
    echo "Please copy .env.example to .env and configure it first."
    exit 1
fi

echo -e "${BLUE}🔍 Carregando variáveis de ambiente...${NC}"
# Prioriza .env na raiz; se não existir, tenta backend/.env
ENV_LOADED=false
if [ -f .env ]; then
    set -a; source .env; set +a
    ENV_LOADED=true
elif [ -f backend/.env ]; then
    set -a; source backend/.env; set +a
    ENV_LOADED=true
else
    echo -e "${YELLOW}⚠️  Nenhum arquivo .env encontrado (raiz ou backend/.env). Continuando com defaults do docker-compose.${NC}"
fi

echo -e "${BLUE}🔍 Validando variáveis obrigatórias...${NC}"
# Alinha com nomes usados no backend/config/settings.py e docker-compose.yml
REQUIRED_VARS=("SECRET_KEY" "MINIO_ROOT_USER" "MINIO_ROOT_PASSWORD")
MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done
if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo -e "${YELLOW}⚠️  Variáveis ausentes: ${MISSING_VARS[*]}${NC}"
    echo "Estas variáveis serão supridas pelos defaults do docker-compose, se aplicável."
else
    echo -e "${GREEN}✅ Variáveis obrigatórias presentes${NC}"
fi

# Backup database (skippable via SKIP_BACKUP=true)
if [[ "${SKIP_BACKUP:-false}" == "true" ]]; then
    echo -e "${YELLOW}⏭️  SKIP_BACKUP ativado: pulando backup de banco${NC}"
else
    echo -e "${YELLOW}📦 Creating database backup...${NC}"
    BACKUP_DIR="./backups"
    mkdir -p "$BACKUP_DIR"

    if docker-compose ps db | grep -q "Up"; then
        BACKUP_FILE="$BACKUP_DIR/backup_pre_deploy_$(date +%Y%m%d_%H%M%S).sql.gz"
        
        if docker-compose exec -T db pg_dump -U postgres projetoravenna | gzip > "$BACKUP_FILE"; then
            # Verify backup was created and has content
            if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
                BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
                echo -e "${GREEN}✅ Backup created: $BACKUP_FILE (${BACKUP_SIZE})${NC}"
                
                # Clean up old backups (keep last 7 days)
                echo -e "${BLUE}🧹 Cleaning up old backups (keeping last 7 days)...${NC}"
                find "$BACKUP_DIR" -name "backup_pre_deploy_*.sql.gz" -mtime +7 -delete 2>/dev/null || true
            else
                echo -e "${RED}❌ Backup file is empty or was not created!${NC}"
                exit 1
            fi
        else
            echo -e "${RED}❌ Backup failed!${NC}"
            # Don't exit here, backup failure shouldn't stop deploy if user wants to proceed
            read -p "Backup failed. Continue anyway? (y/N) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    else
        echo -e "${YELLOW}⚠️  Database not running, skipping backup${NC}"
    fi
fi

# Stop containers
echo -e "${YELLOW}⏸️  Stopping containers...${NC}"
docker-compose down

# Check disk space before building
echo -e "${BLUE}💾 Checking disk space...${NC}"
AVAILABLE_SPACE=$(df -BG . | tail -1 | awk '{print $4}' | sed 's/G//')
# Check if available space is numeric
if [[ "$AVAILABLE_SPACE" =~ ^[0-9]+$ ]]; then
    if [ "$AVAILABLE_SPACE" -lt 5 ]; then
        echo -e "${RED}❌ Warning: Less than 5GB available disk space!${NC}"
        echo "Available: ${AVAILABLE_SPACE}GB"
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
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

echo -e "${BLUE}🔍 Checking backend health...${NC}"
RETRIES=0
MAX_RETRIES=40
HEALTH_URL="${BACKEND_HEALTH_URL:-http://localhost:8001/api/v1/health}"
BASE_URL="${BACKEND_BASE_URL:-http://localhost:8001/api/v1/}"
ADMIN_URL="${BACKEND_ADMIN_URL:-http://localhost:8001/admin/login}"
while [ $RETRIES -lt $MAX_RETRIES ]; do
    if http_ok "$HEALTH_URL"; then
        echo -e "${GREEN}✅ Backend health endpoint responded${NC}"
        break
    elif http_ok "$BASE_URL"; then
        echo -e "${GREEN}✅ Backend API respondeu (fallback)${NC}"
        break
    elif http_ok "$ADMIN_URL"; then
        echo -e "${GREEN}✅ Backend Admin respondeu (fallback)${NC}"
        break
    fi
    echo "Waiting for backend health... (attempt $((RETRIES+1))/$MAX_RETRIES)"
    sleep 2
    RETRIES=$((RETRIES+1))
done
if [ $RETRIES -eq $MAX_RETRIES ]; then
    echo -e "${RED}❌ Backend health check failed${NC}"
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

# Run migrations and setup (somente se manage.py existir no container)
echo -e "${YELLOW}🗃️  Executando migrações...${NC}"
if docker-compose exec -T backend sh -c "test -f manage.py"; then
    docker-compose exec -T backend python manage.py migrate
else
    echo -e "${YELLOW}⚠️  manage.py não encontrado no container backend. Pulando migrações.${NC}"
fi

# Collect static files (somente se manage.py existir)
echo -e "${YELLOW}📁 Coletando arquivos estáticos...${NC}"
if docker-compose exec -T backend sh -c "test -f manage.py"; then
    docker-compose exec -T backend python manage.py collectstatic --noinput
else
    echo -e "${YELLOW}⚠️  manage.py não encontrado. Pulando collectstatic.${NC}"
fi

# Fix MinIO configuration
echo -e "${YELLOW}🔧 Configuring MinIO buckets and policies...${NC}"
docker-compose exec -T backend python manage.py fix_minio || echo -e "${YELLOW}⚠️  MinIO fix script failed, check logs${NC}"

# Check status
echo -e "${YELLOW}📊 Container Status:${NC}"
docker-compose ps

echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo "Next steps (if this is a fresh install):"
echo "1. Create superuser: docker-compose exec backend python manage.py createsuperuser"
echo ""
echo "Access your application at:"
echo "- Frontend: http://localhost:3001"
echo "- Backend API: http://localhost:8001/api/v1/"
echo "- Admin: http://localhost:8001/admin/"
echo "- MinIO Console: http://localhost:9001"
echo ""
