#!/bin/bash

# Script para inicializar Entity padrão no banco de dados

echo "🚀 Inicializando Entity padrão..."

cd backend

# Criar Entity via Django shell
python manage.py shell << EOF
from apps.entities.models import Entity

# Verifica se já existe alguma Entity ativa
if not Entity.objects.filter(is_active=True).exists():
    entity = Entity.objects.create(
        name="Projeto Ravenna",
        domain="localhost",
        brand_name="Projeto Ravenna",
        primary_color="#44B78B",
        secondary_color="#2D3748",
        primary_color_dark="#44B78B",
        secondary_color_dark="#0C4B33",
        footer_text="Todos os direitos reservados.",
        is_active=True
    )
    print(f"✅ Entity criada: {entity.name} ({entity.domain})")
else:
    print("✅ Entity já existe no banco de dados")
EOF

echo "🎉 Inicialização concluída!"
