# Deployment Guide — Projeto Ravenna

## Architecture

```
Internet
   │
   ▼
[Reverse Proxy / CDN]  (NGINX, Cloudflare Tunnel, etc.)
   │              │
   ▼ :3000        ▼ :8000
[frontend]    [backend]  ──► [postgres]
(Next.js)    (Daphne/ASGI)   [redis]
                 │
                 ├──► [celery_worker]   (async tasks)
                 ├──► [celery_beat]     (scheduled tasks)
                 └──► [gameserver] :7777/UDP
```

All containers share the internal `ravenna_net` Docker network.  
External access: only ports **8000**, **3000**, and **7777/UDP** are exposed to the host.

### Shared Volumes

| Volume | Used by | Purpose |
|---|---|---|
| `postgres_data` | postgres | Database files |
| `redis_data` | redis | Redis persistence |
| `media_data` | backend, celery_worker | User-uploaded files |
| `keys_data` | backend (rw), gameserver (ro) | RSA key pair for JWT |

The `keys_data` volume is critical: the backend generates `private.pem` + `public.pem` on first boot. The gameserver reads `public.pem` to validate player JWTs offline without a database call. As long as this volume persists, tokens remain valid across restarts.

### Redis Database Allocation

| DB | Used by |
|---|---|
| `redis/1` | Django cache (django-redis) |
| `redis/2` | Celery broker |
| `redis/3` | Django Channels layer (WebSockets) |

---

## Prerequisites

- Docker >= 24 and Docker Compose v2 (`docker compose`)
- Ports **8000 (TCP)**, **3000 (TCP)**, and **7777 (UDP)** reachable on the host
- Git to clone the repository
- Python 3 available on the host for generating secrets (optional — you can use any method)

---

## First-Time Setup

### 1. Clone the repository

```bash
git clone <repo-url> /opt/ravenna
cd /opt/ravenna
```

### 2. Create the environment file

```bash
cp .env.prod.example .env.prod
```

Edit `.env.prod` and fill in every `CHANGE_ME` value.

**Generate the required secrets:**

```bash
# DJANGO_SECRET_KEY
python3 -c "import secrets; print(secrets.token_urlsafe(64))"

# EMAIL_SETTINGS_ENCRYPTION_SALT
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# DJANGO_WEBHOOK_SECRET (gameserver → backend)
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# POSTGRES_PASSWORD — use any strong password
```

### 3. Build and start all services

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Startup order (automatic):
1. `postgres` and `redis` start and pass healthchecks
2. `backend` starts: generates RSA keys → runs migrations → starts Daphne (ASGI)
3. `backend` passes healthcheck (`/api/health/live/`)
4. `celery_worker`, `celery_beat`, `frontend`, and `gameserver` start

### 4. Create the first admin user

```bash
docker exec -it ravenna_backend python manage.py createsuperuser
```

### 5. Verify all services are healthy

```bash
docker compose -f docker-compose.prod.yml ps
```

```bash
# Backend liveness
curl http://localhost:8000/api/health/live/

# Backend readiness (checks DB + Redis)
curl http://localhost:8000/api/health/ready/

# Frontend
curl http://localhost:3000/
```

---

## Service Overview

| Container | Port | Description |
|---|---|---|
| `ravenna_postgres` | 5432 (internal) | PostgreSQL 16 |
| `ravenna_redis` | 6379 (internal) | Redis 7 |
| `ravenna_backend` | 8000 | Django API + WebSocket via Daphne (ASGI) |
| `ravenna_celery_worker` | — | Async task processing (emails, etc.) |
| `ravenna_celery_beat` | — | Periodic task scheduler |
| `ravenna_frontend` | 3000 | Next.js web application |
| `ravenna_gameserver` | 7777/UDP | C# headless game server (KCP/UDP) |

---

## Environment Variables Reference

### Required (no defaults — startup fails without these)

| Variable | Description |
|---|---|
| `DJANGO_SECRET_KEY` | Django cryptographic secret. Rotating invalidates all sessions and CSRF tokens. |
| `EMAIL_SETTINGS_ENCRYPTION_SALT` | Protects SMTP credentials stored in the database. |
| `DJANGO_WEBHOOK_SECRET` | HMAC secret for signed webhook calls from gameserver → backend. |

### Domain & Security

| Variable | Default | Description |
|---|---|---|
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` | Comma-separated list of valid hostnames. |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated allowed CORS origins. |
| `CSRF_TRUSTED_ORIGINS` | _(empty)_ | Required when behind a proxy (include the proxy origin). |
| `SECURE_SSL_REDIRECT` | `True` | Redirect HTTP → HTTPS. Set `False` if the proxy handles TLS. |
| `SECURE_HSTS_SECONDS` | `0` | HSTS max-age in seconds. Set `31536000` once HTTPS is confirmed stable. |
| `SECURE_HSTS_PRELOAD` | `False` | Enable only after HSTS has been running for a long time. |

### Database

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_DB` | `projeto_ravenna` | Database name. |
| `POSTGRES_USER` | `postgres` | Database user. |
| `POSTGRES_PASSWORD` | — | Database password. |

### Frontend

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `http://backend:8000` | Backend URL **as seen by the browser** (must be a public URL). |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Public URL of the frontend. |

### Game Server

| Variable | Default | Description |
|---|---|---|
| `GAMESERVER_UDP_PORT` | `7777` | UDP port exposed to game clients. |
| `WORLD_WIDTH` / `WORLD_HEIGHT` | `10000` | World dimensions in centimetres. |
| `SPATIAL_CELL_SIZE` | `5000` | Spatial grid cell size (50 m). |

### JWT RSA Keys

By default, the backend auto-generates RSA keys on first boot and persists them in `keys_data`. To inject keys directly (required when running multiple backend replicas):

```bash
# Export existing keys from a running container
docker exec ravenna_backend cat /app/keys/private.pem
docker exec ravenna_backend cat /app/keys/public.pem
```

Paste the full PEM content (including `-----BEGIN...` / `-----END...` lines) into `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY` in `.env.prod`.

### Throttling (optional)

| Variable | Default |
|---|---|
| `REST_THROTTLE_ANON` | `30/min` |
| `REST_THROTTLE_USER` | `120/min` |
| `REST_THROTTLE_LOGIN` | `10/min` |
| `REST_THROTTLE_OTP` | `50/hour` |

### Observability (optional)

| Variable | Description |
|---|---|
| `SENTRY_DSN` | Sentry error tracking. Leave empty to disable. |

---

## API Routes

All routes are prefixed with `/api/v1/`.

### Accounts

| Route | Access | Description |
|---|---|---|
| `POST /api/v1/accounts/auth/register/` | Public | User registration |
| `POST /api/v1/accounts/auth/login/` | Public | JWT login (returns access + refresh) |
| `POST /api/v1/accounts/auth/token/refresh/` | Public | Refresh access token |
| `POST /api/v1/accounts/auth/logout/` | Auth | Blacklist refresh token |
| `POST /api/v1/accounts/email/verify/` | Public | OTP email verification |
| `POST /api/v1/accounts/password/reset/request/` | Public | Password reset request |
| `POST /api/v1/accounts/password/reset/confirm/` | Public | Confirm reset with OTP |
| `GET /api/v1/accounts/admin/diagnostics/` | Admin | Full system diagnostics |

### Blog

| Route | Access | Description |
|---|---|---|
| `GET /api/v1/blog/public/posts/` | Public | Published posts (SSR/SEO, paginated) |
| `GET /api/v1/blog/public/posts/<slug>/` | Public | Single post detail |
| `GET /api/v1/blog/public/categories/` | Public | Categories with post count |
| `GET /api/v1/blog/public/tags/` | Public | Tags |
| `GET /api/v1/blog/public/comments/?post=<id>` | Public | Approved comments |
| `POST /api/v1/blog/public/comments/` | Auth | Submit comment |
| `* /api/v1/blog/posts/` | Auth | Full CRUD + workflow |

### Forum

| Route | Access | Description |
|---|---|---|
| `GET /api/v1/forum/public/categories/` | Public | Active categories |
| `GET /api/v1/forum/public/topics/` | Public | Topic list |
| `GET /api/v1/forum/public/topics/<slug>/with_replies/` | Public | Topic with replies |
| `POST /api/v1/forum/topics/` | Auth | Create topic |
| `POST /api/v1/forum/replies/` | Auth | Create reply |
| `POST /api/v1/forum/replies/<id>/react/` | Auth | React to reply |
| `POST /api/v1/forum/topics/<slug>/pin/` | Mod | Pin topic |
| `POST /api/v1/forum/topics/<slug>/close/` | Mod | Close topic |

### Game Data (public)

| Route | Filters | Description |
|---|---|---|
| `GET /api/v1/game-data/items/` | `rarity`, `item_type`, `min_level`, `max_level`, `search`, `ordering` | Item templates |
| `GET /api/v1/game-data/skills/` | `skill_type`, `search`, `ordering` | Skill templates |
| `GET /api/v1/game-data/maps/` | — | Enabled maps only |
| `GET /api/v1/game-data/bootstrap/?since=<iso>` | `since` | Delta data for Unity client |
| `GET /api/v1/game-data/manifest/` | — | ETag + 304 support |

### Game Logic (authenticated)

| Route | Access | Description |
|---|---|---|
| `GET /api/v1/game-logic/` | Auth | Player instances (inventory + stats) |
| `GET/POST /api/v1/game-logic/inventory/` | Auth | Inventory (POST: admin only) |
| `DELETE /api/v1/game-logic/inventory/<slot>/` | Auth | Remove item by slot |
| `GET /api/v1/game-logic/stats/` | Auth | Player stats |
| `POST /api/v1/game-logic/stats/allocate/` | Auth | Allocate attribute points |
| `POST /api/v1/game-logic/stats/gain-xp/` | Admin | Grant XP |
| `GET /api/v1/game-logic/skills/` | Auth | Player skills |
| `POST /api/v1/game-logic/skills/` | Admin | Learn skill |
| `GET /api/v1/game-logic/quests/` | Auth | Quest progress |
| `POST /api/v1/game-logic/quests/` | Auth | Start quest |
| `POST /api/v1/game-logic/quests/complete/` | Admin | Complete quest + deliver rewards |
| `GET /api/v1/game-logic/quest-templates/` | Public | Quest templates (`?level=`, `?quest_type=`) |
| `GET /api/v1/game-logic/leaderboard/` | Auth | Top players (`?limit=100`) |
| `POST/DELETE /api/v1/game-logic/session/` | Auth | Start / end game session |
| `POST /api/v1/game-logic/events/` | HMAC | GameServer webhook |

### WebSocket

| Endpoint | Description |
|---|---|
| `ws://host:8000/ws/game/<session_id>/` | Real-time game session (Django Channels) |

### Healthchecks

| Endpoint | Description |
|---|---|
| `GET /api/v1/health/live/` | Liveness — 200 if the process is up |
| `GET /api/v1/health/ready/` | Readiness — 503 if DB or Redis is down |
| `GET /api/v1/health/version/` | Build version and SHA |
| `GET /api/v1/accounts/admin/diagnostics/` | Admin: full system health report |

---

## Day-to-Day Operations

### View logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f gameserver
docker compose -f docker-compose.prod.yml logs -f celery_worker
```

### Restart a single service

```bash
docker compose -f docker-compose.prod.yml restart backend
```

### Run a Django management command

```bash
docker exec -it ravenna_backend python manage.py <command>
```

### Maintenance commands

```bash
# Remove OTP codes older than 7 days
docker exec ravenna_backend python manage.py cleanup_otps --days 7

# Remove post view records older than 90 days (prevents unbounded table growth)
docker exec ravenna_backend python manage.py prune_post_views --days 90
```

To automate these, register them as **Periodic Tasks** in the Django admin (`/admin/`) using Celery Beat.

---

## Updating / Redeploying

```bash
cd /opt/ravenna
git pull

# Rebuild and restart all services
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --remove-orphans

# Clean up old images
docker image prune -f
```

> The `gameserver` is built locally from source (no pre-built image in GHCR). It is rebuilt automatically on every deploy.

---

## CI/CD (GitHub Actions)

The pipeline in `.github/workflows/` runs automatically on push to `main`:

1. **CI** (`.github/workflows/ci.yml`) — pytest (backend) + vitest (frontend)
2. **Build & Push** — builds backend and frontend Docker images, pushes to GHCR
3. **Deploy** — SSHs into the production server and runs:
   ```bash
   docker compose -f docker-compose.prod.yml pull
   docker compose -f docker-compose.prod.yml up -d --remove-orphans
   ```

### Required GitHub Secrets

| Secret | Description |
|---|---|
| `DEPLOY_HOST` | Production server IP or hostname |
| `DEPLOY_USER` | SSH user on the server |
| `DEPLOY_SSH_KEY` | Private SSH key (the server must have the public key in `~/.ssh/authorized_keys`) |

---

## Reverse Proxy Setup

### NGINX

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    # Frontend
    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Forwarded-Proto https;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    }

    # Backend REST API
    location /api/ {
        proxy_pass         http://127.0.0.1:8000;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Forwarded-Proto https;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    }

    # WebSocket (Django Channels)
    location /ws/ {
        proxy_pass          http://127.0.0.1:8000;
        proxy_http_version  1.1;
        proxy_set_header    Upgrade    $http_upgrade;
        proxy_set_header    Connection "upgrade";
        proxy_set_header    Host       $host;
        proxy_set_header    X-Forwarded-Proto https;
    }
}
```

When NGINX terminates TLS, set in `.env.prod`:
```
SECURE_SSL_REDIRECT=False
SECURE_HSTS_SECONDS=0
```

### Cloudflare Tunnel

Point the tunnel to `http://localhost:3000` (frontend) and `http://localhost:8000` (backend/API). Set `SECURE_SSL_REDIRECT=False` since Cloudflare handles TLS.

---

## Troubleshooting

**`RuntimeError: DJANGO_SECRET_KEY must be set`**
Set `DJANGO_SECRET_KEY` in `.env.prod`. The value cannot be the default `change-me`.

**`RuntimeError: EMAIL_SETTINGS_ENCRYPTION_SALT must be set`**
Set `EMAIL_SETTINGS_ENCRYPTION_SALT` in `.env.prod`.

**`RuntimeError: JWT RSA keys not found`**
Either the `keys_data` volume was deleted, or the backend startup failed before generating them. Check `docker compose logs backend`. The `keys/generate_keys.py` script runs automatically at startup.

**Celery worker/beat keep restarting**
They depend on `backend: service_healthy`. If the backend healthcheck is failing, fix the backend first:
```bash
docker compose -f docker-compose.prod.yml logs backend
```

**Gameserver can't validate JWTs**
Verify keys exist in the shared volume:
```bash
docker exec ravenna_backend ls -la /app/keys/
```

**WebSocket connections fail**
Ensure your reverse proxy forwards the `Upgrade` header (see NGINX example above). Verify the backend is running Daphne, not Gunicorn:
```bash
docker exec ravenna_backend ps aux | grep daphne
```

**`docker compose pull` skips the gameserver**
This is expected — the gameserver has no GHCR image. It is built locally from `./gameserver/Dockerfile` on every `up -d --build`.
