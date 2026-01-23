#!/bin/bash

echo "========================================="
echo "DIAGNÓSTICO - ColorPickerGroup Missing"
echo "========================================="
echo

# 1. Verificar commit atual
echo "1. COMMIT ATUAL:"
git log -1 --oneline
echo

# 2. Verificar se o arquivo está no repositório
echo "2. ARQUIVO NO REPOSITÓRIO:"
git ls-files | grep ColorPickerGroup
echo

# 3. Verificar se o arquivo existe fisicamente
echo "3. ARQUIVO NO SISTEMA:"
ls -la frontend/src/components/ColorPickerGroup.tsx 2>&1
echo

# 4. Verificar conteúdo do arquivo (primeiras linhas)
echo "4. PRIMEIRAS LINHAS DO ARQUIVO:"
head -n 5 frontend/src/components/ColorPickerGroup.tsx 2>&1
echo

# 5. Verificar git status
echo "5. GIT STATUS:"
git status --short
echo

# 6. Verificar se há .dockerignore problemático
echo "6. DOCKERIGNORE:"
if [ -f frontend/.dockerignore ]; then
    echo "Existe .dockerignore:"
    cat frontend/.dockerignore
else
    echo "Não existe .dockerignore (OK)"
fi
echo

# 7. Verificar package.json tem next-intl
echo "7. NEXT-INTL NO PACKAGE.JSON:"
grep -A2 "next-intl" frontend/package.json
echo

# 8. Testar build local (sem Docker)
echo "8. TESTE: verificar se arquivo pode ser importado:"
cd frontend
if [ -f "src/components/ColorPickerGroup.tsx" ]; then
    echo "✅ Arquivo existe em src/components/ColorPickerGroup.tsx"
else
    echo "❌ Arquivo NÃO existe!"
fi
cd ..

echo
echo "========================================="
echo "FIM DO DIAGNÓSTICO"
echo "========================================="
