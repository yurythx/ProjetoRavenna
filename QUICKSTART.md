# 🚀 Deploy Rápido - ProjetoRavenna

Guia simplificado para deploy no Ubuntu com aaPanel e Cloudflare Tunnel.

## Pré-requisitos

- ✅ Servidor Ubuntu com Docker e Docker Compose
- ✅ aaPanel instalado
- ✅ Cloudflare Tunnel configurado

## Deploy em 5 Passos

### 1. Clonar/Atualizar Repositório

```bash
# SSH no servidor
ssh usuario@servidor

# Primeira vez - clonar
cd /www/wwwroot
git clone https://github.com/seu-usuario/ProjetoRavenna.git projetoravenna

# Atualizações - pull
cd /www/wwwroot/projetoravenna
git pull origin main
```

### 2. Configurar Ambiente

```bash
cd /www/wwwroot/projetoravenna

# Copiar .env
cp .env.example .env

# Gerar SECRET_KEY
python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'

# Editar .env e colar a SECRET_KEY
nano .env
```

**Configurar no `.env`**:
```bash
DJANGO_SECRET_KEY=<cole-aqui-a-secret-key-gerada>
DB_PASSWORD=senha_forte_postgres
MINIO_ROOT_PASSWORD=senha_forte_minio
GUNICORN_WORKERS=5  # (2 x CPUs) + 1
```

Salvar: `Ctrl+O`, `Enter`, `Ctrl+X`

### 3. Dar Permissões

```bash
chmod +x deploy.sh backend/entrypoint.sh
```

### 4. Deploy

```bash
./deploy.sh
```

Aguarde 5-10 minutos. Script faz tudo automaticamente.

### 5. Criar Superuser

```bash
docker-compose exec backend python manage.py createsuperuser
```

## Cloudflare Tunnel

Seu `config.yml` deve ter:

```yaml
ingress:
  - hostname: projetoravenna.cloud
    service: http://frontend:3001
  
  - hostname: api.projetoravenna.cloud
    service: http://backend:8000
  
  - service: http_status:404
```

> [!IMPORTANT]
> **Configuração de Rede Docker:** 
> - As portas do backend (8000) e frontend (3001) **não são expostas** no host para maior segurança
> - O Cloudflare Tunnel DEVE estar na mesma rede Docker (`projetoravenna_network`)
> - Adicione ao docker-compose do cloudflared: `networks: - projetoravenna_network`
> - Depois, configure a rede como externa: `networks: projetoravenna_network: external: true`

## Verificação

```bash
# Status (todos devem estar "healthy")
docker-compose ps

# Logs
docker-compose logs -f
```

## Acessar

- Frontend: https://projetoravenna.cloud
- API: https://api.projetoravenna.cloud/api/v1/
- Admin: https://api.projetoravenna.cloud/admin/

## Comandos Úteis

```bash
# Atualizar
cd /www/wwwroot/projetoravenna
git pull
./deploy.sh

# Backup
docker-compose exec db pg_dump -U postgres projetoravenna_db > backup.sql

# Logs
docker-compose logs backend

# Reiniciar
docker-compose restart backend
```

---

✅ **Pronto!** Deployment completo em 5 passos.
