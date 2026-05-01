# Backend — Projeto Ravenna

API Django REST Framework com suporte a WebSocket (Django Channels), tarefas assíncronas (Celery) e autenticação JWT RS256.

> Documentação completa: [docs/backend.md](../docs/backend.md)

---

## Setup Rápido

### Docker (recomendado)

```bash
cd backend
docker-compose up -d
docker exec ravenna_web python manage.py seed_dev
```

Acesse a API em `http://localhost:8000/api/v1/`  
Django Admin em `http://localhost:8000/admin/` (admin@ravenna.gg / admin123)

### Local (com venv)

```bash
cd backend

python -m venv venv
source venv/Scripts/activate    # Windows
# source venv/bin/activate      # Linux/Mac

pip install -r requirements.txt tinycss2

# Com SQLite (sem Docker)
USE_SQLITE=True DEBUG=True DJANGO_SECRET_KEY=dev EMAIL_SETTINGS_ENCRYPTION_SALT=dev \
  python manage.py migrate
  python manage.py seed_dev
  python manage.py runserver

# Com Postgres (Docker só para infra)
docker-compose up -d db redis
export $(grep -v '^#' .env | sed 's/\r//' | xargs)
export POSTGRES_HOST=localhost
python manage.py migrate && python manage.py seed_dev && python manage.py runserver
```

---

## Testes

```bash
source venv/Scripts/activate
pytest -q                             # 147 testes
pytest --cov=apps --cov-report=term   # com cobertura
```

---

## Estrutura

```
backend/
├── core/               # settings, urls, celery, asgi, wsgi
├── apps/
│   ├── common/         # UUIDModel base
│   ├── accounts/       # usuários, JWT, OTP, auditoria, SMTP
│   ├── blog/           # posts, categorias, comentários
│   ├── forum/          # tópicos, replies, reações, moderação
│   ├── game_data/      # templates públicos (itens, skills, mapas)
│   └── game_logic/     # inventário, stats, quests, leaderboard, sessões
├── keys/               # RSA private.pem + public.pem
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
```

---

## Variáveis de Ambiente

Arquivo: `backend/.env`

| Variável | Dev padrão | Descrição |
|---|---|---|
| `USE_SQLITE` | `False` | `True` para usar SQLite |
| `DEBUG` | `True` | Modo debug |
| `DJANGO_SECRET_KEY` | `dev-local-change-me` | Segredo Django |
| `POSTGRES_HOST` | `db` | Use `localhost` para dev local |
| `REDIS_URL` | `redis://redis:6379/1` | Vazio desativa Redis |
| `DJANGO_WEBHOOK_SECRET` | `ravenna-secret-123` | HMAC para webhook do GameServer |
| `EMAIL_SETTINGS_ENCRYPTION_SALT` | `dev-local-email-salt` | Salt para criptografar credenciais SMTP |
