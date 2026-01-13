# PowerShell script para inicializar Entity padrão

Write-Host "🚀 Inicializando Entity padrão..." -ForegroundColor Cyan

Set-Location backend

# Criar Entity via Django shell
$pythonScript = @"
from apps.entities.models import Entity

# Verifica se já existe alguma Entity ativa
if not Entity.objects.filter(is_active=True).exists():
    entity = Entity.objects.create(
        name='Projeto Ravenna',
        domain='localhost',
        brand_name='Projeto Ravenna',
        primary_color='#44B78B',
        secondary_color='#2D3748',
        primary_color_dark='#44B78B',
        secondary_color_dark='#0C4B33',
        footer_text='Todos os direitos reservados.',
        is_active=True
    )
    print(f'✅ Entity criada: {entity.name} ({entity.domain})')
else:
    print('✅ Entity já existe no banco de dados')
"@

$pythonScript | python manage.py shell

Write-Host "🎉 Inicialização concluída!" -ForegroundColor Green
