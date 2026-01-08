#!/bin/bash

# ProjetoRavenna - MinIO Diagnostic Script
# Este script verifica todas as configurações relacionadas ao MinIO

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 ProjetoRavenna - MinIO Diagnostic Script${NC}"
echo "=============================================="
echo ""

# Load environment variables
if [ -f .env ]; then
    set -a
    source .env
    set +a
    echo -e "${GREEN}✅ Arquivo .env carregado${NC}"
else
    echo -e "${YELLOW}⚠️  Arquivo .env não encontrado${NC}"
fi

echo ""

# 1. Verificar se containers estão rodando
echo -e "${BLUE}📦 1. Verificando containers Docker...${NC}"
if docker-compose ps minio | grep -q "Up"; then
    echo -e "${GREEN}✅ Container MinIO está rodando${NC}"
    docker-compose ps minio | grep minio
else
    echo -e "${RED}❌ Container MinIO NÃO está rodando${NC}"
    echo "   Execute: docker-compose up -d minio"
    exit 1
fi

if docker-compose ps backend | grep -q "Up"; then
    echo -e "${GREEN}✅ Container Backend está rodando${NC}"
else
    echo -e "${YELLOW}⚠️  Container Backend NÃO está rodando${NC}"
fi

echo ""

# 2. Verificar configurações do MinIO
echo -e "${BLUE}⚙️  2. Verificando configurações do MinIO...${NC}"
MINIO_USER=${MINIO_ROOT_USER:-minioadmin}
MINIO_PASS=${MINIO_ROOT_PASSWORD:-minioadmin_secure_password_123}
BUCKET_NAME=${MINIO_BUCKET_NAME:-projetoravenna}

echo "   MINIO_ROOT_USER: ${MINIO_ROOT_USER:-não configurado}"
echo "   MINIO_BUCKET_NAME: ${BUCKET_NAME}"
echo "   MINIO_PUBLIC_DOMAIN: ${MINIO_PUBLIC_DOMAIN:-não configurado}"

if [ -z "${MINIO_ROOT_USER}" ] || [ -z "${MINIO_ROOT_PASSWORD}" ]; then
    echo -e "${RED}❌ Variáveis MINIO_ROOT_USER ou MINIO_ROOT_PASSWORD não configuradas${NC}"
else
    echo -e "${GREEN}✅ Credenciais do MinIO configuradas${NC}"
fi

echo ""

# 3. Verificar se MinIO está acessível internamente
echo -e "${BLUE}🔌 3. Testando conectividade interna do MinIO...${NC}"
if docker-compose exec -T minio curl -f http://localhost:9000/minio/health/live > /dev/null 2>&1; then
    echo -e "${GREEN}✅ MinIO está respondendo internamente${NC}"
else
    echo -e "${RED}❌ MinIO NÃO está respondendo internamente${NC}"
    echo "   Verifique os logs: docker-compose logs minio"
fi

echo ""

# 4. Verificar bucket
echo -e "${BLUE}🪣 4. Verificando bucket do MinIO...${NC}"

# Configurar alias do MinIO client
docker-compose exec -T minio mc alias set myminio http://localhost:9000 "$MINIO_USER" "$MINIO_PASS" > /dev/null 2>&1 || true

# Verificar se bucket existe
if docker-compose exec -T minio mc ls myminio/$BUCKET_NAME > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Bucket '$BUCKET_NAME' existe${NC}"
    
    # Verificar permissões do bucket
    PERMISSIONS=$(docker-compose exec -T minio mc anonymous get myminio/$BUCKET_NAME 2>&1 || echo "none")
    if echo "$PERMISSIONS" | grep -q "download"; then
        echo -e "${GREEN}✅ Bucket tem permissões públicas (download)${NC}"
    else
        echo -e "${YELLOW}⚠️  Bucket NÃO tem permissões públicas${NC}"
        echo "   Execute: docker-compose exec minio mc anonymous set download myminio/$BUCKET_NAME"
    fi
    
    # Listar alguns arquivos do bucket
    FILE_COUNT=$(docker-compose exec -T minio mc ls myminio/$BUCKET_NAME --recursive 2>/dev/null | wc -l || echo "0")
    echo "   Arquivos no bucket: $FILE_COUNT"
else
    echo -e "${RED}❌ Bucket '$BUCKET_NAME' NÃO existe${NC}"
    echo "   Execute: docker-compose exec minio mc mb myminio/$BUCKET_NAME"
    echo "   E depois: docker-compose exec minio mc anonymous set download myminio/$BUCKET_NAME"
fi

echo ""

# 5. Testar MinIO via comando Django
echo -e "${BLUE}🧪 5. Testando MinIO via Django management command...${NC}"
if docker-compose exec -T backend python manage.py test_minio --check-bucket 2>&1 | tee /tmp/minio_test.log; then
    echo -e "${GREEN}✅ Teste do Django passou${NC}"
else
    echo -e "${YELLOW}⚠️  Alguns testes falharam (veja detalhes acima)${NC}"
fi

echo ""

# 6. Verificar configurações do Django
echo -e "${BLUE}🐍 6. Verificando configurações do Django...${NC}"
if docker-compose exec -T backend python -c "
from django.conf import settings
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

print(f'USE_MINIO: {getattr(settings, \"USE_MINIO\", False)}')
print(f'AWS_STORAGE_BUCKET_NAME: {getattr(settings, \"AWS_STORAGE_BUCKET_NAME\", \"não configurado\")}')
print(f'AWS_S3_ENDPOINT_URL: {getattr(settings, \"AWS_S3_ENDPOINT_URL\", \"não configurado\")}')
print(f'AWS_S3_CUSTOM_DOMAIN: {getattr(settings, \"AWS_S3_CUSTOM_DOMAIN\", \"não configurado\")}')
print(f'AWS_S3_SIGNATURE_VERSION: {getattr(settings, \"AWS_S3_SIGNATURE_VERSION\", \"não configurado\")}')
print(f'DEFAULT_FILE_STORAGE: {getattr(settings, \"DEFAULT_FILE_STORAGE\", \"não configurado\")}')
" 2>/dev/null; then
    echo -e "${GREEN}✅ Configurações do Django acessíveis${NC}"
else
    echo -e "${YELLOW}⚠️  Não foi possível verificar configurações do Django${NC}"
    echo "   Verifique se o backend está rodando: docker-compose logs backend"
fi

echo ""

# 7. Verificar Cloudflare Tunnel
echo -e "${BLUE}☁️  7. Verificando Cloudflare Tunnel...${NC}"

# Verificar se container do Cloudflare está rodando
CLOUDFLARE_CONTAINER=$(docker ps --format "{{.Names}}" | grep -i cloudflare | head -n1)
if [ -z "$CLOUDFLARE_CONTAINER" ]; then
    echo -e "${YELLOW}⚠️  Container do Cloudflare não encontrado${NC}"
    echo "   Verifique se o Cloudflare Tunnel está rodando"
else
    echo -e "${GREEN}✅ Container do Cloudflare encontrado: $CLOUDFLARE_CONTAINER${NC}"
    
    # Verificar se está na rede correta
    if docker inspect "$CLOUDFLARE_CONTAINER" | grep -q "projetoravenna_network"; then
        echo -e "${GREEN}✅ Cloudflare está na rede 'projetoravenna_network'${NC}"
    else
        echo -e "${YELLOW}⚠️  Cloudflare NÃO está na rede 'projetoravenna_network'${NC}"
        echo "   Execute: docker network connect projetoravenna_network $CLOUDFLARE_CONTAINER"
    fi
fi

echo ""

# 8. Testar acesso ao MinIO via domínio público
echo -e "${BLUE}🌐 8. Testando acesso público ao MinIO...${NC}"
if [ -n "${MINIO_PUBLIC_DOMAIN}" ]; then
    TEST_URL="https://${MINIO_PUBLIC_DOMAIN}/${BUCKET_NAME}/"
    echo "   Testando: $TEST_URL"
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$TEST_URL" 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "403" ] || [ "$HTTP_CODE" = "404" ]; then
        echo -e "${GREEN}✅ Domínio responde (HTTP $HTTP_CODE)${NC}"
        if [ "$HTTP_CODE" = "404" ]; then
            echo "   (404 é esperado se o bucket estiver vazio ou não tiver index)"
        fi
    elif [ "$HTTP_CODE" = "000" ]; then
        echo -e "${RED}❌ Domínio NÃO responde (timeout ou erro de conexão)${NC}"
        echo "   Verifique se o Cloudflare Tunnel está configurado para:"
        echo "   minio.projetoravenna.cloud -> http://minio:9000"
    else
        echo -e "${YELLOW}⚠️  Domínio responde com código HTTP $HTTP_CODE${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  MINIO_PUBLIC_DOMAIN não configurado${NC}"
fi

echo ""

# 9. Testar geração de URL no Django
echo -e "${BLUE}🔗 9. Testando geração de URL no Django...${NC}"
TEST_URL=$(docker-compose exec -T backend python -c "
from django.conf import settings
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

# Criar arquivo de teste
test_file = ContentFile(b'test content')
path = default_storage.save('test/diagnostic_test.txt', test_file)
url = default_storage.url(path)
print(url)

# Limpar arquivo de teste
default_storage.delete(path)
" 2>/dev/null || echo "erro")

if [ "$TEST_URL" != "erro" ] && [ -n "$TEST_URL" ]; then
    echo -e "${GREEN}✅ URL gerada com sucesso:${NC}"
    echo "   $TEST_URL"
    
    # Verificar se a URL aponta para o domínio correto
    if echo "$TEST_URL" | grep -q "${MINIO_PUBLIC_DOMAIN:-minio.projetoravenna.cloud}"; then
        echo -e "${GREEN}✅ URL aponta para o domínio correto do MinIO${NC}"
    elif echo "$TEST_URL" | grep -q "api.projetoravenna.cloud"; then
        echo -e "${RED}❌ URL está apontando para api.projetoravenna.cloud (INCORRETO)${NC}"
        echo "   Deveria apontar para ${MINIO_PUBLIC_DOMAIN:-minio.projetoravenna.cloud}"
    else
        echo -e "${YELLOW}⚠️  URL não contém o domínio esperado${NC}"
    fi
else
    echo -e "${RED}❌ Erro ao gerar URL${NC}"
    echo "   Verifique os logs: docker-compose logs backend"
fi

echo ""

# 10. Verificar endpoint /api/img do frontend
echo -e "${BLUE}🖼️  10. Verificando endpoint /api/img do frontend...${NC}"
if docker-compose ps frontend | grep -q "Up"; then
    echo -e "${GREEN}✅ Frontend está rodando${NC}"
    echo "   O endpoint /api/img está disponível em:"
    echo "   https://projetoravenna.cloud/api/img?url=..."
else
    echo -e "${YELLOW}⚠️  Frontend NÃO está rodando${NC}"
fi

echo ""

# Resumo final
echo -e "${BLUE}📋 RESUMO:${NC}"
echo "=========="

ISSUES=0

# Verificar problemas críticos
if ! docker-compose ps minio | grep -q "Up"; then
    echo -e "${RED}❌ MinIO não está rodando${NC}"
    ISSUES=$((ISSUES+1))
fi

if ! docker-compose exec -T minio mc ls myminio/$BUCKET_NAME > /dev/null 2>&1; then
    echo -e "${RED}❌ Bucket não existe${NC}"
    ISSUES=$((ISSUES+1))
fi

if [ -z "${MINIO_PUBLIC_DOMAIN}" ]; then
    echo -e "${YELLOW}⚠️  MINIO_PUBLIC_DOMAIN não configurado${NC}"
    ISSUES=$((ISSUES+1))
fi

if [ "$ISSUES" -eq 0 ]; then
    echo -e "${GREEN}✅ Todas as verificações críticas passaram!${NC}"
    echo ""
    echo "Próximos passos:"
    echo "1. Verifique se o Cloudflare Tunnel tem a rota:"
    echo "   minio.projetoravenna.cloud -> http://minio:9000"
    echo "2. Faça upload de uma imagem e verifique se a URL gerada está correta"
    echo "3. Teste acessar uma imagem diretamente via:"
    echo "   https://minio.projetoravenna.cloud/projetoravenna/articles/banners/..."
else
    echo -e "${YELLOW}⚠️  Encontrados $ISSUES problema(s) que precisam ser corrigidos${NC}"
fi

echo ""
