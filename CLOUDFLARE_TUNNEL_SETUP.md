# Configuração Cloudflare Tunnel - Projeto Ravenna

## 🌐 Portas Configuradas

| Serviço | Porta Container | Porta Host | Domínio Público |
|---------|----------------|------------|----------------|
| Backend | 8000 | 8001 | api.projetoravenna.cloud |
| Frontend | 3001 | 3001 | projetoravenna.cloud |
| PostgreSQL | 5432 | 5432 | (interno) |
| Redis | 6379 | 6379 | (interno) |
| MinIO API | 9000 | 9000 | minio.projetoravenna.cloud |
| MinIO Console | 9001 | 9001 | (interno) |

## ⚙️ Configuração do Cloudflare Tunnel

### docker-compose.yml
```yaml
services:
  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: cloudflared
    restart: unless-stopped
    network_mode: "host"  # Permite acesso a localhost:8001 e localhost:3001
    volumes:
      - ./etc/cloudflared:/etc/cloudflared
    command: tunnel --no-autoupdate run --token <SEU_TOKEN>
```

### Cloudflare Dashboard Configuration

Acesse: https://one.dash.cloudflare.com

**Zero Trust** → **Access** → **Tunnels** → Seu Tunnel → **Public Hostnames**

Configure os seguintes **Public Hostnames**:

#### 1. Frontend (Principal)
- **Subdomain**: (vazio ou `www`)
- **Domain**: `projetoravenna.cloud`
- **Type**: `HTTP`
- **URL**: `localhost:3001`

#### 2. Backend API
- **Subdomain**: `api`
- **Domain**: `projetoravenna.cloud`
- **Type**: `HTTP`
- **URL**: `localhost:8001`

#### 3. MinIO Storage (Opcional)
- **Subdomain**: `minio`
- **Domain**: `projetoravenna.cloud`
- **Type**: `HTTP`
- **URL**: `localhost:9000`

## 🔐 Configuração CORS

No arquivo `backend/.env`:

```bash
# Domínios permitidos
ALLOWED_HOSTS=localhost,127.0.0.1,.projetoravenna.cloud,api.projetoravenna.cloud,192.168.1.121

# CORS - Permite domínios via Cloudflare Tunnel
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://192.168.1.121:3001,https://projetoravenna.cloud,https://www.projetoravenna.cloud,https://api.projetoravenna.cloud
```

## 🧪 Testes de Conectividade

### 1. Testar Localmente (Servidor)

```bash
# Backend
curl http://localhost:8001/api/v1/entities/config/

# Frontend
curl http://localhost:3001

# MinIO
curl http://localhost:9000/minio/health/live
```

### 2. Testar via Domínio Público

```bash
# Backend API
curl https://api.projetoravenna.cloud/api/v1/entities/config/

# Frontend
curl https://projetoravenna.cloud

# MinIO (se configurado)
curl https://minio.projetoravenna.cloud/minio/health/live
```

## 🚀 Deploy Completo

```bash
# 1. No servidor, atualizar código
cd ~/ProjetoRavenna
git pull origin main

# 2. Parar containers
docker-compose down

# 3. Rebuild (se necessário)
docker-compose build --no-cache

# 4. Iniciar todos os serviços
docker-compose up -d

# 5. Verificar status
docker-compose ps

# 6. Verificar logs
docker-compose logs -f
```

## 🔍 Troubleshooting

### Erro CORS mesmo após configuração

```bash
# Verificar se .env foi carregado
docker-compose exec backend printenv | grep CORS

# Restart do backend
docker-compose restart backend
```

### Cloudflare Tunnel não conecta

```bash
# Ver logs do cloudflared
docker logs cloudflared

# Restart do tunnel
docker restart cloudflare
d

# Verificar token
# O token é único e não deve ser compartilhado
```

### Backend não responde via domínio

```bash
# 1. Testar localmente primeiro
curl http://localhost:8001/api/v1/entities/config/

# 2. Se local funciona, verificar Cloudflare Dashboard
# Confirmar que api.projetoravenna.cloud → localhost:8001

# 3. Verificar logs
docker-compose logs backend | grep "GET /api/v1/"
```

## 📊 Monitoramento

```bash
# Status dos containers
docker-compose ps

# Uso de recursos
docker stats

# Logs em tempo real
docker-compose logs -f backend frontend cloudflared
```

## ✅ Checklist de Produção

- [x] Cloudflare Tunnel configurado
- [x] Public Hostnames configurados no Dashboard
- [x] Backend em `localhost:8001`
- [x] Frontend em `localhost:3001`
- [x] CORS configurado com domínios HTTPS
- [x] SSL/TLS gerenciado pelo Cloudflare
- [ ] DNS apontando para Cloudflare
- [ ] Verificar logs sem erros
- [ ] Testar todas as funcionalidades via domínio

## 🔗 Links Importantes

- **Frontend**: https://projetoravenna.cloud
- **Backend API**: https://api.projetoravenna.cloud/api/v1/
- **Cloudflare Dashboard**: https://one.dash.cloudflare.com
- **Documentação Cloudflare Tunnel**: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/
