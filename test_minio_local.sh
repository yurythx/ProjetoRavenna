#!/bin/bash

# Script para testar MinIO localmente
# Execute este script quando o Docker estiver rodando

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🧪 Testando Configuração do MinIO${NC}"
echo "=================================="
echo ""

# Verificar se Docker está rodando
if ! docker ps > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker não está rodando!${NC}"
    echo "Por favor, inicie o Docker Desktop e tente novamente."
    exit 1
fi

# Verificar se containers estão rodando
echo -e "${BLUE}📦 Verificando containers...${NC}"
if ! docker-compose ps | grep -q "Up"; then
    echo -e "${YELLOW}⚠️  Containers não estão rodando${NC}"
    echo "Iniciando containers..."
    docker-compose up -d
    echo "Aguardando containers ficarem prontos..."
    sleep 10
fi

echo -e "${GREEN}✅ Containers estão rodando${NC}"
echo ""

# Executar teste básico
echo -e "${BLUE}🔍 Teste 1: Verificação básica${NC}"
docker-compose exec -T backend python manage.py test_minio
echo ""

# Executar teste com verificação de bucket
echo -e "${BLUE}🔍 Teste 2: Verificação de bucket${NC}"
docker-compose exec -T backend python manage.py test_minio --check-bucket
echo ""

# Executar teste completo com upload
echo -e "${BLUE}🔍 Teste 3: Teste completo (upload)${NC}"
docker-compose exec -T backend python manage.py test_minio --check-bucket --test-upload
echo ""

echo -e "${GREEN}✅ Todos os testes concluídos!${NC}"
