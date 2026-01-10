# 🚀 Guia de Deploy - ProjetoRavenna

**Guia prático e consolidado para fazer o deploy do ProjetoRavenna em produção.**

---

## 📋 Pré-requisitos

### Servidor
- ✅ Ubuntu 20.04+ (ou servidor Linux com Docker)
- ✅ 2GB RAM mínimo (4GB recomendado)
- ✅ 20GB de espaço em disco
- ✅ Acesso SSH configurado

### Domínio e DNS
- ✅ Domínio configurado (ex: `projetoravenna.cloud`)
- ✅ Cloudflare ativo no domínio
- ✅ Cloudflare Tunnel criado

### Local (Desenvolvimento)
- ✅ Docker Desktop instalado (Windows/Mac)
- ✅ OU Docker Engine + Docker Compose (Linux)
- ✅ Git instalado

---

## 🔧 Configuração Inicial

### 1. Instalar Docker no Servidor

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER
newgrp docker

# Verificar instalação
docker --version
docker compose version  # ou docker-compose --version
```

### 2. Clonar Projeto

```bash
# Criar diretório
sudo mkdir -p /www/wwwroot
cd /www/wwwroot

# Clonar repositório
git clone https://github.com/SEU_USUARIO/ProjetoRavenna.git
cd ProjetoRavenna

# Dar permissões
chmod +x deploy.sh
chmod +x backend/entrypoint.sh
```

### 3. Configurar Variáveis de Ambiente

```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar configurações
nano .env
```

**Variáveis obrigatórias:**

```env
# Django
DJANGO_SECRET_KEY=SUA_CHAVE_SECRETA_AQUI  # Gerar com comando abaixo
DEBUG=False

# Database
DB_PASSWORD=SENHA_FORTE_POSTGRES

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=SENHA_FORTE_MINIO
MINIO_BUCKET_NAME=projetoravenna

# Gunicorn (opcional - padrão: 3 workers)
GUNICORN_WORKERS=5
GUNICORN_TIMEOUT=120
```

**Gerar SECRET_KEY:**
```bash
python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
```

**Gerar senha forte:**
```bash
openssl rand -base64 32
```

---

## ☁️ Configurar Cloudflare Tunnel

### 1. Configurar Rotas no Dashboard

Acesse: [Cloudflare Zero Trust](https://one.dash.cloudflare.com) → Tunnels → Seu Tunnel

**Adicionar 3 Public Hostnames:**

#### Rota 1: Frontend
```
Subdomain:    (vazio) ou www
Domain:       projetoravenna.cloud
Service Type: HTTP
URL:          http://frontend:3001
```

#### Rota 2: Backend API
```
Subdomain:    api
Domain:       projetoravenna.cloud
Service Type: HTTP
URL:          http://backend:8000
```

#### Rota 3: MinIO (Storage) ⚠️ IMPORTANTE!
```
Subdomain:    minio
Domain:       projetoravenna.cloud
Service Type: HTTP
URL:          http://minio:9000
```

> **⚠️ CRÍTICO:** A rota do MinIO é obrigatória! Sem ela, as imagens não funcionarão.

### 2. Conectar Cloudflared à Rede Docker

```bash
# Verificar nome do container cloudflared
docker ps | grep cloudflare

# Criar rede (se não existir)
docker network create projetoravenna_network

# Conectar cloudflared à rede
docker network connect projetoravenna_network NOME_DO_CONTAINER_CLOUDFLARE

# Exemplo:
docker network connect projetoravenna_network cloudflared
```

---

## 🚀 Executar Deploy

### Deploy Automatizado

```bash
cd /www/wwwroot/ProjetoRavenna

# Executar script de deploy
./deploy.sh
```

**O script irá:**
- ✅ Validar variáveis de ambiente
- ✅ Criar backup do banco de dados
- ✅ Parar containers antigos
- ✅ Construir novas imagens
- ✅ Iniciar todos os serviços
- ✅ Executar migrations
- ✅ Coletar arquivos estáticos
- ✅ Configurar bucket do MinIO

**Tempo estimado:** 10-15 minutos (primeira vez)

---

## 🔐 Configuração Pós-Deploy

### 1. Criar Superusuário

```bash
docker compose exec backend python manage.py createsuperuser
```

Preencha:
- Username: `admin`
- Email: `seu@email.com`
- Password: (senha forte)

### 2. Verificar MinIO

```bash
# Verificar se bucket foi criado
docker compose exec backend python manage.py fix_minio

# Verificar status do MinIO
docker compose ps minio
```

---

## ✅ Testar Instalação

### 1. Verificar Containers

```bash
docker compose ps

# Todos devem estar "Up" e "healthy"
```

### 2. Testar URLs

**Frontend:**
```
https://projetoravenna.cloud
```
✅ Deve carregar a página inicial

**API Health:**
```
https://api.projetoravenna.cloud/health/
```
✅ Deve retornar: `{"status":"healthy"}`

**Admin Django:**
```
https://api.projetoravenna.cloud/admin/
```
✅ Deve mostrar tela de login

**MinIO (opcional):**
```
https://minio.projetoravenna.cloud
```
✅ Deve mostrar console do MinIO

### 3. Testar Upload de Imagem

1. Acessar: `https://api.projetoravenna.cloud/admin/`
2. Login com superuser
3. Criar um artigo com imagem
4. Acessar site público
5. Verificar se imagem carrega
6. **Inspecionar URL da imagem** (F12):
   - ✅ Deve ser: `https://minio.projetoravenna.cloud/...`
   - ❌ NÃO deve ser: `http://localhost:9000/...`

---

## 🔄 Atualizar Deploy

Quando houver alterações no código:

```bash
# 1. Conectar ao servidor
ssh usuario@SEU_SERVIDOR

# 2. Navegar ao projeto
cd /www/wwwroot/ProjetoRavenna

# 3. Atualizar código
git pull origin main

# 4. Executar deploy
./deploy.sh

# 5. Verificar logs
docker compose logs -f backend frontend
```

---

## 🆘 Problemas Comuns

### Container não inicia

```bash
# Ver logs
docker compose logs NOME_DO_CONTAINER

# Exemplos:
docker compose logs backend
docker compose logs frontend
docker compose logs db
```

### Erro 502 Bad Gateway

**Causas:**
- Containers não estão rodando
- Cloudflare Tunnel desconectado

**Solução:**
```bash
# Verificar containers
docker compose ps

# Reiniciar se necessário
docker compose restart backend frontend

# Verificar logs do Cloudflare
docker logs NOME_DO_CONTAINER_CLOUDFLARE
```

### Imagens quebradas (404)

**Causas:**
- Rota do MinIO não configurada no Cloudflare
- `MINIO_PUBLIC_DOMAIN` incorreto no `docker-compose.yml`

**Verificar:**
```bash
# Ver configuração atual
docker compose exec backend env | grep MINIO_PUBLIC_DOMAIN

# Deve mostrar:
# MINIO_PUBLIC_DOMAIN=https://minio.projetoravenna.cloud
```

**Solução:**
1. Verificar rota no Cloudflare Tunnel
2. Verificar se `docker-compose.yml` tem domínio correto
3. Reconnectar cloudflared à rede Docker

**Documentação completa:** Ver `docs/deploy/MINIO_CONFIG.md`

### Banco de dados não conecta

```bash
# Verificar se PostgreSQL está rodando
docker compose ps db

# Ver logs do banco
docker compose logs db

# Reiniciar banco
docker compose restart db

# Aguardar 10 segundos e testar
docker compose exec backend python manage.py migrate
```

---

## 🔐 Segurança

### Checklist de Segurança

- [ ] `DEBUG=False` no `.env`
- [ ] `DJANGO_SECRET_KEY` única e forte
- [ ] Senhas fortes para DB e MinIO
- [ ] Firewall configurado (apenas SSH permitido)
- [ ] HTTPS via Cloudflare
- [ ] Arquivo `.env` no `.gitignore`
- [ ] Nunca commitar `.env` no Git
- [ ] SSL/TLS Mode no Cloudflare = **Full**

### Configurar Firewall

```bash
# Habilitar firewall
sudo ufw enable

# Permitir SSH (IMPORTANTE!)
sudo ufw allow 22/tcp
sudo ufw allow OpenSSH

# ⚠️ NÃO expor portas Docker (8000, 3001, 9000, 9001)
# O Cloudflare Tunnel acessa internamente

# Verificar status
sudo ufw status
```

---

## 📦 Backup

### Backup Manual

```bash
# Backup do banco
docker compose exec -T db pg_dump -U postgres projetoravenna | gzip > backup_$(date +%Y%m%d).sql.gz

# Backup do MinIO (opcional)
docker compose exec -T minio mc mirror myminio/projetoravenna ./backups/minio/
```

### Backup Automático (Cron)

```bash
# Editar crontab
crontab -e

# Adicionar backup diário às 3h da manhã
0 3 * * * cd /www/wwwroot/ProjetoRavenna && docker compose exec -T db pg_dump -U postgres projetoravenna | gzip > /backups/db_$(date +\%Y\%m\%d).sql.gz

# Limpar backups antigos (manter 30 dias)
0 4 * * * find /backups -name "db_*.sql.gz" -mtime +30 -delete
```

---

## 📊 Monitoramento

### Ver Logs em Tempo Real

```bash
# Todos os serviços
docker compose logs -f

# Apenas backend
docker compose logs -f backend

# Apenas frontend
docker compose logs -f frontend

# Últimas 50 linhas
docker compose logs --tail=50 backend
```

### Ver Status dos Containers

```bash
# Status geral
docker compose ps

# Uso de recursos
docker stats

# Espaço em disco
docker system df -v
```

---

## 📚 Documentação Adicional

- **QUICKSTART.md** - Deploy rápido em 5 passos
- **docs/deploy/DEPLOY_COMPLETO.md** - Guia detalhado passo a passo
- **docs/deploy/PRODUCTION.md** - Configurações avançadas de produção
- **docs/deploy/MINIO_CONFIG.md** - Configuração completa do MinIO + Cloudflare

---

## 🎯 Resumo

### Comandos Essenciais

```bash
# Deploy inicial
./deploy.sh

# Atualizar deploy
git pull && ./deploy.sh

# Criar superuser
docker compose exec backend python manage.py createsuperuser

# Ver logs
docker compose logs -f backend frontend

# Verificar status
docker compose ps

# Reiniciar serviço
docker compose restart backend

# Parar tudo
docker compose down

# Iniciar tudo
docker compose up -d
```

### URLs Importantes

- **Frontend:** https://projetoravenna.cloud
- **API:** https://api.projetoravenna.cloud
- **Admin:** https://api.projetoravenna.cloud/admin/
- **API Docs:** https://api.projetoravenna.cloud/api/docs/
- **MinIO:** https://minio.projetoravenna.cloud

---

**Última atualização:** 2026-01-10  
**Versão:** 1.0
