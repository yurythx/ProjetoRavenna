# Infraestrutura e Setup Local

---

## Serviços

| Container | Porta | Descrição |
|---|---|---|
| `ravenna_postgres` | 5432 | PostgreSQL 16 — banco de dados principal |
| `ravenna_redis` | 6379 | Redis 7 — cache, Celery e Channels |
| `ravenna_web` | 8000 | Django API (gunicorn, 4 workers) |
| `ravenna_celery_worker` | — | Processamento assíncrono (e-mails, recompensas) |
| `ravenna_celery_beat` | — | Agendador de tarefas periódicas |
| `ravenna_gameserver` | 7777/UDP | Servidor de jogo C# KCP/UDP |

### Alocação do Redis

| DB | Uso |
|---|---|
| `redis/1` | Cache Django (django-redis) + Leaderboard Sorted Set |
| `redis/2` | Broker Celery |
| `redis/3` | Django Channels layer (WebSockets) |

---

## Setup Local (Desenvolvimento)

### Pré-requisitos
- Docker Desktop em execução
- Python 3.11+ com `venv`
- Node.js 20+

### 1 — Subir infraestrutura via Docker

```bash
cd backend
docker-compose up -d
```

Isso sobe: postgres, redis, web (gunicorn), celery_worker, celery_beat e gameserver.

### 2 — Popular banco com dados de teste

```bash
docker exec ravenna_web python manage.py seed_dev
```

Cria:
- Usuário admin (`admin@ravenna.gg` / `admin123`, is_staff=True, Lv.10)
- 3 categorias de blog + 5 posts publicados
- 3 categorias de fórum + 5 tópicos com replies
- 4 item templates (armas, armadura, consumível)
- 5 quest templates (história, side, daily, repeatable)

### 3 — Subir o frontend

```bash
cd frontend
npm install
npm run dev     # http://localhost:3000
```

### Alternativa: backend local (sem Docker para o Django)

Use quando precisar de debugger ou reload automático:

```bash
cd backend
docker-compose up -d db redis          # apenas infraestrutura

source venv/Scripts/activate           # Windows
# source venv/bin/activate             # Linux/Mac

# Setar variáveis (os valores estão no .env, POSTGRES_HOST vira localhost)
export $(grep -v '^#' .env | sed 's/\r//' | xargs)
export POSTGRES_HOST=localhost

python manage.py migrate
python manage.py seed_dev
python manage.py runserver 0.0.0.0:8000   # suporte ASGI + WebSocket
```

---

## Chaves RSA

O backend usa criptografia assimétrica para JWT entre serviços.

| Arquivo | Gerado por | Usado por |
|---|---|---|
| `keys/private.pem` | Backend no boot (`generate_keys.py`) | Backend — assina JWTs |
| `keys/public.pem` | Backend no boot | GameServer — valida JWTs sem chamar o banco |

- Em `DEBUG=True`, as chaves são geradas automaticamente na primeira execução.
- O volume Docker `keys_data` é compartilhado entre `web` e `gameserver` (somente leitura).
- Em produção, injete via `JWT_PRIVATE_KEY` e `JWT_PUBLIC_KEY` (variáveis de ambiente com PEM completo).

---

## Protobuf

As definições em `proto/game_messages.proto` definem o protocolo binário entre GameServer e Unity.

Para recompilar após alterar `.proto`:

```bash
# C# (GameServer + Unity)
protoc --csharp_out=gameserver/src/RavennaServer/Proto game_messages.proto
```

---

## CI/CD (GitHub Actions)

Pipeline em `.github/workflows/`:

| Workflow | Trigger | Jobs |
|---|---|---|
| `ci.yml` | Push em `main`/`develop`, PR para `main`, chamada por `deploy.yml` | `backend` (pytest + cobertura), `frontend` (tsc + vitest), `gameserver` (.NET build) |
| `deploy.yml` | Push em `main` | Roda CI → Build Docker → Push para GHCR → Deploy via SSH |

### Segredos necessários no GitHub

| Segredo | Descrição |
|---|---|
| `DEPLOY_HOST` | IP ou hostname do servidor de produção |
| `DEPLOY_USER` | Usuário SSH |
| `DEPLOY_SSH_KEY` | Chave SSH privada (a pública deve estar em `~/.ssh/authorized_keys` no servidor) |

---

## Volumes Docker (Desenvolvimento)

| Volume | Usado por | Conteúdo |
|---|---|---|
| `postgres_data` | postgres | Arquivos do banco de dados |
| `redis_data` | redis | Persistência do Redis (AOF) |
| `keys_data` | web (rw), gameserver (ro) | Par de chaves RSA |

---

## Variáveis de Ambiente Principais (`backend/.env`)

| Variável | Padrão (dev) | Descrição |
|---|---|---|
| `USE_SQLITE` | `False` | `True` para usar SQLite (sem Docker) |
| `POSTGRES_HOST` | `db` | Nome do serviço Docker; use `localhost` para dev local |
| `REDIS_URL` | `redis://redis:6379/1` | URL do Redis; vazio desativa Redis (usa LocMem) |
| `DEBUG` | `True` | Modo de debug Django |
| `DJANGO_SECRET_KEY` | `dev-local-change-me` | Segredo criptográfico |
| `DJANGO_WEBHOOK_SECRET` | `ravenna-secret-123` | HMAC para webhook do GameServer |
| `REST_THROTTLING_ENABLED` | `False` | Rate limiting (ativar em produção) |
