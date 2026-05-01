# Projeto Ravenna — Game Ecosystem

Ecossistema completo para jogo MMO multiplayer com portal web integrado e servidor de jogo headless.

---

## Documentação

| Arquivo | Conteúdo |
|---|---|
| [docs/infrastructure.md](./docs/infrastructure.md) | Setup local, Docker, variáveis de ambiente |
| [docs/backend.md](./docs/backend.md) | API Django, modelos, tarefas assíncronas |
| [docs/frontend.md](./docs/frontend.md) | Interface Next.js, páginas, hooks |
| [docs/gameserver.md](./docs/gameserver.md) | Servidor C# KCP/UDP |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Fluxo de dados e segurança |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Deploy completo em produção |

---

## Stack

| Camada | Tecnologia |
|---|---|
| **Backend** | Django 5, DRF, PostgreSQL 16, Redis 7, Celery, Channels |
| **Frontend** | Next.js 15, TanStack Query, Tailwind CSS v4 |
| **Game Server** | .NET 8 (C#), KCP/UDP, Protobuf |
| **Infra** | Docker Compose, GitHub Actions CI/CD, NGINX |

---

## Estrutura do Repositório

```
ProjetoRavenna/
├── backend/            # Django API (porta 8000)
├── frontend/           # Next.js portal (porta 3000)
├── gameserver/         # C# servidor headless (porta 7777/UDP)
├── proto/              # Definições Protobuf compartilhadas
├── docs/               # Documentação técnica por módulo
├── ARCHITECTURE.md     # Fluxo de dados e segurança
├── DEPLOYMENT.md       # Guia de produção
└── .github/workflows/  # CI/CD (ci.yml + deploy.yml)
```

---

## Início Rápido (Desenvolvimento)

### Pré-requisitos
- Docker Desktop em execução
- Node.js 20+ e npm
- Python 3.11+

### Subir o backend (Docker)

```bash
cd backend
docker-compose up -d          # postgres + redis + web + celery
docker exec ravenna_web python manage.py seed_dev   # dados de teste
```

### Subir o frontend

```bash
cd frontend
npm install
npm run dev                    # http://localhost:3000
```

### Credenciais de teste (após seed_dev)

| Campo | Valor |
|---|---|
| Email | `admin@ravenna.gg` |
| Senha | `admin123` |
| Django Admin | http://localhost:8000/admin/ |

---

© 2026 Projeto Ravenna.
