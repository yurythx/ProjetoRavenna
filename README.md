# ProjetoRavenna

Plataforma de blog/artigos com Django REST Framework e Next.js.

## 🚀 Quick Start

Veja [QUICKSTART.md](QUICKSTART.md) para deploy em 5 passos.

## 📋 Comandos

Veja [COMMANDS.md](COMMANDS.md) para referência rápida de comandos Docker.

## 🏗️ Stack

- **Backend**: Django 5.1 + DRF + PostgreSQL
- **Frontend**: Next.js 15 + TypeScript + TailwindCSS
- **Storage**: MinIO (S3-compatible)
- **Deploy**: Docker Compose + Cloudflare Tunnel

## 📁 Estrutura

```
ProjetoRavenna/
├── backend/          # Django API
├── frontend/         # Next.js app
├── docker-compose.yml
├── deploy.sh
└── QUICKSTART.md
```

## 🔧 Desenvolvimento Local

```bash
# Instalar dependências
cd backend && pip install -r requirements.txt
cd frontend && npm install

# Iniciar serviços
docker-compose up -d

# Criar superuser
docker-compose exec backend python manage.py createsuperuser
```

## 📦 Git Workflow (Como subir alterações)

```bash
# 1. Verificar arquivos modificados
git status

# 2. Adicionar tudo (após conferir)
git add .

# 3. Commitar com mensagem descritiva
git commit -m "descrição das alterações"

# 4. Enviar para o GitHub
git push origin main
```

### Atualizar em Produção

```bash
# No servidor via SSH:
cd /www/wwwroot/projetoravenna
git pull origin main
./deploy.sh
```

## 🌐 Acesso

- **Frontend**: http://localhost:3001
- **API**: http://localhost:8000/api/v1/
- **Admin**: http://localhost:8000/admin/
- **MinIO**: http://localhost:9001

## 📚 Documentação

### Deploy
- [DEPLOY_COMPLETO.md](DEPLOY_COMPLETO.md) - **Guia completo passo a passo** (18 etapas detalhadas)
- [QUICKSTART.md](QUICKSTART.md) - Guia rápido (5 passos)

### Referência
- [Docker Commands](docs/COMMANDS.md) - Referência de comandos Docker
- [Backend Architecture](docs/backend/ARCHITECTURE.md) - Arquitetura do sistema
- [Django Admin](docs/backend/DJANGO_ADMIN_README.md) - Guia do Admin
- [MinIO Setup](docs/MINIO_SETUP.md) - **Configuração completa do MinIO** (armazenamento de arquivos)

## 🔐 Produção

Domínios:
- **Frontend**: https://projetoravenna.cloud
- **API**: https://api.projetoravenna.cloud

Deploy via Cloudflare Tunnel (veja QUICKSTART.md).
