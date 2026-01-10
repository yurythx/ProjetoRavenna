# ProjetoRavenna

Plataforma de blog/artigos moderna com Django REST Framework e Next.js.

## 🚀 Quick Start

**Deploy em 5 passos:**

```bash
# 1. Clonar projeto
git clone https://github.com/SEU_USUARIO/ProjetoRavenna.git
cd ProjetoRavenna

# 2. Configurar variáveis
cp .env.example .env
nano .env  # Configure suas credenciais

# 3. Executar deploy
./deploy.sh

# 4. Criar superuser
docker compose exec backend python manage.py createsuperuser

# 5. Acessar
# Frontend: http://localhost:3001
# Admin: http://localhost:8000/admin/
```

**Guia completo:** [QUICKSTART.md](QUICKSTART.md)

---

## 🏗️ Stack Tecnológica

- **Backend:** Django 5.1 + Django REST Framework
- **Frontend:** Next.js 15 + TypeScript + TailwindCSS  
- **Banco de Dados:** PostgreSQL 15
- **Cache:** Redis 7
- **Storage:** MinIO (S3-compatible)
- **Deploy:** Docker Compose + Cloudflare Tunnel

---

## 📁 Estrutura do Projeto

```
ProjetoRavenna/
├── backend/              # API Django
│   ├── apps/            # Aplicações Django
│   │   ├── accounts/    # Autenticação e usuários
│   │   ├── articles/    # Sistema de artigos/blog
│   │   ├── core/        # Funcionalidades centrais
│   │   └── entities/    # Entidades do negócio
│   ├── config/          # Configurações Django
│   └── Dockerfile
├── frontend/            # Aplicação Next.js
│   ├── src/            # Código fonte
│   └── Dockerfile
├── docs/               # Documentação adicional
│   └── deploy/         # Guias de deploy
├── docker-compose.yml  # Orquestração dos serviços
├── deploy.sh          # Script de deploy automatizado
└── .env.example       # Template de variáveis
```

---

## 🔧 Desenvolvimento Local

### Pré-requisitos

- Docker Desktop (Windows/Mac) ou Docker Engine + Docker Compose (Linux)  
- Git

### Iniciar Ambiente

```bash
# 1. Configurar variáveis (opcional para dev local)
cp .env.example .env

# 2. Iniciar ambiente completo
docker compose up -d

# 3. Criar superuser
docker compose exec backend python manage.py createsuperuser
```

### Acessar Aplicação

- **Frontend:** http://localhost:3001
- **Backend API:** http://localhost:8000/api/v1/
- **Admin Django:** http://localhost:8000/admin/
- **API Docs (Swagger):** http://localhost:8000/api/docs/
- **MinIO Console:** http://localhost:9001 (user: `minioadmin` / pass: `minioadmin`)

### Comandos Úteis

```bash
# Ver logs
docker compose logs -f backend frontend

# Parar ambiente
docker compose down

# Rebuild completo
docker compose down
docker compose build --no-cache
docker compose up -d

# Executar migrations
docker compose exec backend python manage.py migrate

# Criar app Django
docker compose exec backend python manage.py startapp nome_app

# Shell Django
docker compose exec backend python manage.py shell
```

---

## 📦 Deploy em Produção

### Pré-requisitos

- Servidor Ubuntu 20.04+ com Docker
- Domínio configurado (ex: `projetoravenna.cloud`)
- Cloudflare Tunnel configurado

### Deploy Rápido

```bash
# No servidor via SSH
cd /www/wwwroot/ProjetoRavenna
git pull origin main
./deploy.sh
```

### Documentação de Deploy

- **[DEPLOY_GUIDE.md](DEPLOY_GUIDE.md)** ⭐ **Comece aqui!** - Guia prático completo
- **[QUICKSTART.md](QUICKSTART.md)** - Deploy rápido em 5 passos
- **[docs/deploy/DEPLOY_COMPLETO.md](docs/deploy/DEPLOY_COMPLETO.md)** - Passo a passo detalhado
- **[docs/deploy/PRODUCTION.md](docs/deploy/PRODUCTION.md)** - Configurações avançadas
- **[docs/deploy/MINIO_CONFIG.md](docs/deploy/MINIO_CONFIG.md)** - Setup do MinIO + Cloudflare

---

## 🔐 Produção

### Domínios

- **Frontend:** https://projetoravenna.cloud
- **API Backend:** https://api.projetoravenna.cloud  
- **MinIO Storage:** https://minio.projetoravenna.cloud

### Segurança

O projeto já vem configurado com:
- ✅ `DEBUG=False` por padrão em produção
- ✅ CORS/CSRF configurados
- ✅ HTTPS via Cloudflare Tunnel
- ✅ Variáveis sensíveis via `.env`
- ✅ Validação de variáveis no deploy
- ✅ Backup automático do banco

### Configuração Mínima Obrigatória

No arquivo `.env`:

```env
# Django
DJANGO_SECRET_KEY=sua_chave_secreta_aqui
DEBUG=False

# Database  
DB_PASSWORD=senha_forte_postgres

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=senha_forte_minio
```

**Gerar SECRET_KEY:**
```bash
python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
```

---

## 🧪 Testes

```bash
# Rodar todos os testes
docker compose exec backend python manage.py test

# Testar app específico
docker compose exec backend python manage.py test apps.articles

# Rodar localmente (sem Docker)
cd backend
pip install -r requirements.txt
python manage.py test
```

---

## 🔄 Git Workflow

### Subir Alterações

```bash
# 1. Verificar modificações
git status

# 2. Adicionar arquivos
git add .

# 3. Commitar
git commit -m "Descrição das alterações"

# 4. Enviar para GitHub
git push origin main
```

### Atualizar em Produção

```bash
# No servidor via SSH
cd /www/wwwroot/ProjetoRavenna
git pull origin main
./deploy.sh
```

---

## 🔧 Troubleshooting

### Problemas Comuns

**Imagens quebradas (403 Forbidden):**
- Ver: **[docs/TROUBLESHOOTING_MINIO_DOUBLE_HTTPS.md](docs/TROUBLESHOOTING_MINIO_DOUBLE_HTTPS.md)**
- Causa comum: `MINIO_PUBLIC_DOMAIN` com `https://` (não adicione, Django faz automaticamente)

**Container não inicia:**
```bash
docker compose logs nome_do_container
```

**Erro 502 Bad Gateway:**
```bash
docker compose ps
docker compose restart backend frontend
```

**Banco de dados:**
```bash
docker compose logs db
docker compose restart db
```

### Logs

```bash
# Ver logs em tempo real
docker compose logs -f backend

# Últimas 50 linhas
docker compose logs --tail=50 backend

# Todos os serviços
docker compose logs -f
```

---

## 🆘 Suporte e Troubleshooting

### Problemas Comuns

**Container não inicia:**
```bash
docker compose logs nome_do_container
```

**Erro 502 Bad Gateway:**
```bash
docker compose ps
docker compose restart backend frontend
```

**Imagens quebradas:**
- Verificar configuração do MinIO
- Ver: [docs/deploy/MINIO_CONFIG.md](docs/deploy/MINIO_CONFIG.md)

**Banco de dados:**
```bash
docker compose logs db
docker compose restart db
```

### Logs

```bash
# Ver logs em tempo real
docker compose logs -f backend

# Últimas 50 linhas
docker compose logs --tail=50 backend

# Todos os serviços
docker compose logs -f
```

---

## 📚 Documentação Completa

### Essenciais
- **[DEPLOY_GUIDE.md](DEPLOY_GUIDE.md)** - Guia de deploy consolidado
- **[QUICKSTART.md](QUICKSTART.md)** - Início rápido

### Deploy Detalhado
- **[docs/deploy/DEPLOY_COMPLETO.md](docs/deploy/DEPLOY_COMPLETO.md)** - Guia completo passo a passo
- **[docs/deploy/PRODUCTION.md](docs/deploy/PRODUCTION.md)** - Configurações de produção
- **[docs/deploy/MINIO_CONFIG.md](docs/deploy/MINIO_CONFIG.md)** - Configuração do MinIO

### Backend
- **[docs/backend/ARCHITECTURE.md](docs/backend/ARCHITECTURE.md)** - Arquitetura do backend
- **[docs/backend/DJANGO_ADMIN_README.md](docs/backend/DJANGO_ADMIN_README.md)** - Guia do Django Admin

---

## 🤝 Contribuindo

```bash
# 1. Fork o projeto
# 2. Criar branch
git checkout -b feature/nova-funcionalidade

# 3. Commitar alterações
git commit -m "Add: nova funcionalidade"

# 4. Push para branch
git push origin feature/nova-funcionalidade

# 5. Abrir Pull Request
```

---

## 📝 Licença

Este projeto está sob a licença MIT.

---

## 👤 Autor

**ProjetoRavenna Team**

- Website: https://projetoravenna.cloud
- API: https://api.projetoravenna.cloud

---

**Última atualização:** 2026-01-10  
**Versão:** 1.0.0
