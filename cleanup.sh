#!/bin/bash

# Script de Limpeza - ProjetoRavenna
# Remove arquivos redundantes mantendo apenas o essencial

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}🧹 ProjetoRavenna - Limpeza de Arquivos Redundantes${NC}"
echo "=================================================="
echo ""

# Contador
REMOVED=0

# Função para remover arquivo com confirmação
remove_file() {
    local file=$1
    if [ -f "$file" ]; then
        echo -e "${RED}❌ Removendo: $file${NC}"
        rm "$file"
        REMOVED=$((REMOVED+1))
    else
        echo -e "${YELLOW}⚠️  Não encontrado: $file${NC}"
    fi
}

echo "Os seguintes arquivos serão REMOVIDOS:"
echo "1. DEPLOY.md (redundante com QUICKSTART.md)"
echo "2. PRODUCTION.md (redundante com QUICKSTART.md)"
echo "3. backend/ARCHITECTURE.md (opcional)"
echo "4. backend/DJANGO_ADMIN_README.md (opcional)"
echo "5. backend/TYPESCRIPT_GUIDE.md (erro - backend é Python)"
echo "6. backend/README.md (opcional)"
echo "7. frontend/README.md (opcional)"
echo ""
echo -e "${YELLOW}Arquivos MANTIDOS:${NC}"
echo "✅ QUICKSTART.md - Guia de deploy em 5 passos"
echo "✅ COMMANDS.md - Referência rápida"
echo "✅ Todos os arquivos Docker (docker-compose.yml, Dockerfiles, etc)"
echo ""

read -p "Deseja continuar? (s/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo -e "${YELLOW}Operação cancelada.${NC}"
    exit 0
fi

echo ""
echo "Removendo arquivos..."
echo ""

# Remover documentação redundante da raiz
remove_file "DEPLOY.md"
remove_file "PRODUCTION.md"

# Remover documentação opcional do backend
remove_file "backend/ARCHITECTURE.md"
remove_file "backend/DJANGO_ADMIN_README.md"
remove_file "backend/TYPESCRIPT_GUIDE.md"
remove_file "backend/README.md"

# Remover documentação opcional do frontend
remove_file "frontend/README.md"

echo ""
echo -e "${GREEN}✅ Limpeza concluída!${NC}"
echo ""
echo "Arquivos removidos: $REMOVED"
echo ""
echo "Estrutura final de documentação:"
echo "  ├── QUICKSTART.md      (Guia de deploy)"
echo "  ├── COMMANDS.md        (Referência de comandos)"
echo "  ├── docker-compose.yml (Essencial)"
echo "  ├── deploy.sh          (Essencial)"
echo "  └── .env.example       (Essencial)"
echo ""
echo -e "${YELLOW}Próximos passos:${NC}"
echo "1. Revisar mudanças: git status"
echo "2. Commitar: git add . && git commit -m 'docs: limpar documentação redundante'"
echo "3. Push: git push origin main"
echo ""
