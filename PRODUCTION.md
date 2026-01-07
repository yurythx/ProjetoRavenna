# 🔒 Production Configuration Guide

Este documento descreve as configurações específicas de produção para ProjetoRavenna.

## 📋 Variáveis de Ambiente

### Backend (Django)

Todas as variáveis podem ser configuradas no arquivo `.env` na raiz do projeto:

```env
# ============================================
# Django Core
# ============================================
DJANGO_SECRET_KEY=                    # OBRIGATÓRIO: Chave secreta única
DEBUG=False                           # SEMPRE False em produção

# ============================================
# Database
# ============================================
DB_PASSWORD=                          # OBRIGATÓRIO: Senha do PostgreSQL

# ============================================
# MinIO Storage
# ============================================
MINIO_ROOT_USER=                      # OBRIGATÓRIO: Username do MinIO
MINIO_ROOT_PASSWORD=                  # OBRIGATÓRIO: Senha do MinIO
MINIO_BUCKET_NAME=projetoravenna      # Nome do bucket

# ============================================
# Domains (já configurado no docker-compose)
# ============================================
# Não precisa alterar, mas pode sobrescrever:
# ALLOWED_HOSTS=api.projetoravenna.cloud,localhost
# CORS_ALLOWED_ORIGINS=https://projetoravenna.cloud
# CSRF_TRUSTED_ORIGINS=https://api.projetoravenna.cloud
```

### Frontend (Next.js)

A URL da API é configurada durante o build via `docker-compose.yml`:

```yaml
NEXT_PUBLIC_API_URL=https://api.projetoravenna.cloud/api/v1
```

## 🔐 Segurança

### 1. Gerar SECRET_KEY Segura

```bash
python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
```

### 2. Senhas Fortes

Use senhas fortes para:
- `DB_PASSWORD` (PostgreSQL)
- `MINIO_ROOT_PASSWORD` (MinIO)
- Superuser do Django

**Gerador de senha aleatória:**
```bash
openssl rand -base64 32
```

### 3. Configurações de Segurança do Django

O arquivo `settings.py` já está configurado com:

```python
DEBUG = False
ALLOWED_HOSTS = ['api.projetoravenna.cloud', 'localhost', 'backend']
CORS_ALLOWED_ORIGINS = ['https://projetoravenna.cloud']
CSRF_TRUSTED_ORIGINS = ['https://api.projetoravenna.cloud']
```

### 4. HTTPS

O SSL é gerenciado pelo **Cloudflare Tunnel**, então:
- Os containers rodam em HTTP internamente (portas 8000, 3001)
- O Cloudflare Tunnel faz o proxy HTTPS
- Configure SSL/TLS mode no Cloudflare como **Full** ou **Full (strict)**

### 5. Firewall

```bash
# Permitir apenas portas essenciais
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 8888/tcp  # aaPanel (se usar)

# NÃO expor portas Docker diretamente
# 8000, 3001, 9000, 9001 devem ser acessíveis apenas via localhost

sudo ufw enable
```

## 📦 MinIO Configuration

### Criar Bucket

Após o deploy, crie o bucket do MinIO:

**Via Console Web (http://seu-ip:9001):**
1. Login com credenciais do MinIO
2. Criar bucket: `projetoravenna`
3. Access Policy: `Public` (para servir imagens)

**Via CLI:**
```bash
docker-compose exec minio mc alias set myminio http://localhost:9000 $MINIO_ROOT_USER $MINIO_ROOT_PASSWORD
docker-compose exec minio mc mb myminio/projetoravenna
docker-compose exec minio mc anonymous set download myminio/projetoravenna
```

### MinIO como CDN

Para usar MinIO como CDN para arquivos de mídia:

1. Configure um domínio para MinIO (ex: `cdn.projetoravenna.cloud`)
2. Adicione ao Cloudflare Tunnel:
   ```yaml
   - hostname: cdn.projetoravenna.cloud
     service: http://localhost:9000
   ```
3. Configure Cloudflare para cache de assets

## 🗄️ Database

### PostgreSQL Production Settings

O PostgreSQL está configurado no `docker-compose.yml`:

```yaml
POSTGRES_DB: projetoravenna_db
POSTGRES_USER: postgres
POSTGRES_PASSWORD: ${DB_PASSWORD}
```

### Backup Automático

Crie um cronjob para backup diário:

```bash
# Editar crontab
crontab -e

# Adicionar backup diário às 3h da manhã
0 3 * * * cd /www/wwwroot/projetoravenna && docker-compose exec -T db pg_dump -U postgres projetoravenna_db | gzip > /backups/projetoravenna_$(date +\%Y\%m\%d).sql.gz

# Adicionar limpeza de backups antigos (manter 30 dias)
0 4 * * * find /backups -name "projetoravenna_*.sql.gz" -mtime +30 -delete
```

Criar diretório de backups:
```bash
sudo mkdir -p /backups
sudo chown $USER:$USER /backups
```

## 🔄 Continuous Deployment

### Script de Deploy Automatizado

Crie um script `deploy.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Backup do banco
echo "📦 Creating database backup..."
docker-compose exec -T db pg_dump -U postgres projetoravenna_db > backup_pre_deploy_$(date +%Y%m%d_%H%M%S).sql

# Parar containers
echo "⏸️  Stopping containers..."
docker-compose down

# Atualizar código (se usar git)
echo "📥 Pulling latest code..."
# git pull origin main

# Rebuild containers
echo "🔨 Building containers..."
docker-compose build

# Iniciar containers
echo "▶️  Starting containers..."
docker-compose up -d

# Aguardar containers ficarem saudáveis
echo "⏳ Waiting for healthy containers..."
sleep 10

# Executar migrations
echo "🗄️  Running migrations..."
docker-compose exec -T backend python manage.py migrate --noinput

# Coletar static files
echo "📁 Collecting static files..."
docker-compose exec -T backend python manage.py collectstatic --noinput

# Verificar status
echo "✅ Checking status..."
docker-compose ps

echo "🎉 Deployment completed!"
```

Tornar executável:
```bash
chmod +x deploy.sh
```

Usar:
```bash
./deploy.sh
```

## 📊 Monitoramento

### Logs

Configure rotação de logs para evitar uso excessivo de disco:

```bash
# Criar arquivo de configuração do Docker
sudo nano /etc/docker/daemon.json
```

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Reiniciar Docker:
```bash
sudo systemctl restart docker
```

### Health Checks

Os containers já têm health checks configurados:

```bash
# Verificar saúde dos containers
docker-compose ps

# Ver detalhes do health check
docker inspect projetoravenna_backend | grep -A 10 Health
```

### Alertas

Configure alertas para monitorar:
- Uptime dos containers
- Uso de disco (volumes)
- Uso de memória/CPU
- Erros nos logs

**Ferramentas recomendadas:**
- Portainer (interface web para Docker)
- Prometheus + Grafana
- Uptime Kuma

## 🔧 Otimizações

### 1. PostgreSQL

Para melhor performance, ajuste as configurações do PostgreSQL:

```yaml
# No docker-compose.yml, adicione em db.command:
command: postgres -c shared_buffers=256MB -c max_connections=200
```

### 2. Gunicorn Workers

Ajuste workers do Gunicorn em `backend/entrypoint.sh`:

```bash
# Regra: (2 x CPU cores) + 1
exec gunicorn config.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers 4 \
  --threads 2 \
  --timeout 60 \
  --access-logfile - \
  --error-logfile -
```

### 3. Next.js

O Next.js já está otimizado com `output: 'standalone'` para menor tamanho de imagem.

### 4. MinIO Performance

Para alta disponibilidade, considere:
- Usar MinIO em modo distribuído (multiple nodes)
- Configurar replicação de buckets
- Usar um storage backend dedicado

## 📝 Checklist de Segurança

Antes de ir para produção:

- [ ] `DEBUG=False` no Django
- [ ] `SECRET_KEY` única e segura
- [ ] Senhas fortes para DB e MinIO
- [ ] HTTPS via Cloudflare Tunnel configurado
- [ ] Firewall configurado (UFW)
- [ ] Backup automático configurado
- [ ] Logs com rotação configurada
- [ ] Domains corretos em `ALLOWED_HOSTS`, `CORS`, `CSRF`
- [ ] MinIO bucket criado e acessível
- [ ] Health checks funcionando
- [ ] Superuser do Django criado
- [ ] Testar criação de artigo com imagem
- [ ] Testar autenticação e JWT
- [ ] Monitoramento configurado

## 🆘 Troubleshooting de Produção

### Alto Uso de Memória

```bash
# Ver uso de memória por container
docker stats

# Limitar memória no docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 512M
```

### Alto Uso de Disco

```bash
# Ver uso de disco dos volumes
docker system df -v

# Limpar logs antigos
truncate -s 0 $(docker inspect --format='{{.LogPath}}' projetoravenna_backend)

# Limpar imagens não usadas
docker image prune -a
```

### Database Connection Pool Exhausted

```bash
# Ver conexões ativas
docker-compose exec db psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Aumentar max_connections no PostgreSQL
# Adicionar em docker-compose.yml > db > command:
command: postgres -c max_connections=200
```

---

**Última atualização:** 2026-01-06
