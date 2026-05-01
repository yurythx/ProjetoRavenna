# Backend — Django API

O backend é o **Single Source of Truth** do projeto: persiste o estado do jogador, serve a API REST, gerencia WebSockets e coordena tarefas assíncronas.

---

## Stack

| Componente | Tecnologia |
|---|---|
| Framework | Django 5 + Django REST Framework |
| Banco de dados | PostgreSQL 16 |
| Cache / Leaderboard | Redis 7 (django-redis) |
| Filas assíncronas | Celery 5 + Celery Beat (agendamento) |
| WebSocket | Django Channels + channels-redis |
| Autenticação | JWT RS256 (simplejwt) + blacklist |
| Documentação da API | drf-spectacular (OpenAPI 3) |

---

## Estrutura de Pastas

```
backend/
├── core/
│   ├── settings.py     # Toda configuração (DB, Cache, JWT, Celery, CORS)
│   ├── urls.py         # Roteamento global sob /api/v1/
│   ├── celery.py       # Instância e descoberta de tarefas
│   ├── asgi.py         # Entry point ASGI (WebSocket via Channels)
│   └── wsgi.py         # Entry point WSGI (produção sem WebSocket)
├── apps/
│   ├── common/         # UUIDModel base, utilitários compartilhados
│   ├── accounts/       # Usuários, JWT, OTP, auditoria, SMTP
│   ├── blog/           # Posts, categorias, tags, comentários
│   ├── forum/          # Tópicos, replies, reações, moderação
│   ├── game_data/      # Templates públicos (itens, skills, mapas)
│   └── game_logic/     # Instâncias do jogador (inventário, stats, quests)
├── keys/               # RSA private.pem + public.pem (gerados no boot)
├── requirements.txt
├── Dockerfile
└── docker-compose.yml  # Dev: postgres + redis + web + celery
```

---

## Módulos

### `accounts/`
- **Custom User Model** com UUID como PK, HWID tracking, `display_name`
- **JWT RS256**: backend assina com `private.pem`; gameserver valida com `public.pem`
- **OTP por e-mail**: verificação de conta e reset de senha (expiração configurável)
- **Audit Log**: registra banimentos, mudanças de e-mail e ações administrativas
- **Diagnósticos**: endpoint admin com status de SMTP, Redis, Postgres e versão do app

### `blog/`
- Posts com workflow: `draft → published → archived`
- Categorias, tags, comentários com aprovação
- Controle de visibilidade (`is_public`, `is_featured`)
- Contagem de visualizações e tempo estimado de leitura

### `forum/`
- Categorias, tópicos e respostas com contadores atômicos
- Moderação: fixar, fechar, arquivar, ocultar resposta, marcar solução
- Reações em tópicos e respostas
- Busca por texto com `SearchFilter`

### `game_data/`
Templates **somente leitura, públicos** — consumidos pelo cliente Unity e pelo frontend.

| Modelo | Filtros disponíveis |
|---|---|
| `ItemTemplate` | `?rarity=`, `?item_type=`, `?min_level=`, `?max_level=`, `?search=`, `?ordering=` |
| `SkillTemplate` | `?skill_type=`, `?search=`, `?ordering=` |
| `MapData` | somente mapas com `is_enabled=True` |

Endpoints especiais:
- `GET /api/v1/game-data/manifest/` — ETag + suporte a `304 Not Modified`
- `GET /api/v1/game-data/bootstrap/?since=<iso>` — delta de dados para o cliente Unity

### `game_logic/`
Instâncias dinâmicas por jogador.

**`GameLogicService`** — todas as operações usam `select_for_update()` para garantir atomicidade em ambientes com múltiplos workers:

| Método | Descrição |
|---|---|
| `gain_experience(user, amount)` | Concede XP, calcula level-up e pontos de atributo. Atualiza o leaderboard Redis. |
| `add_item_to_inventory(user, item_id, qty)` | Adiciona item com empilhamento e gestão de slots. |
| `remove_item_from_inventory(user, slot)` | Remove item por índice de slot. |
| `allocate_points(user, allocations)` | Distribui pontos de atributo acumulados. |
| `complete_quest(user, quest_id)` | Marca quest como concluída **e entrega recompensas** (XP, gold, itens) do `QuestTemplate`. Resets automáticos para quests `is_repeatable`. |
| `learn_skill(user, skill_id)` | Aprende ou sobe de nível uma skill. |
| `get_leaderboard(limit)` | Lê o ranking de Redis com `ZREVRANGE` (O(log N + M)). |

**`QuestTemplate`** — define objetivos e recompensas das missões:
```json
{
  "xp": 500,
  "gold": 120,
  "items": [{"item_template_id": "<uuid>", "quantity": 1}]
}
```

**Webhook do GameServer** (`POST /api/v1/game-logic/webhook/`):
- Autenticado por HMAC-SHA256 (`X-Webhook-Secret`)
- Eventos: `xp_gained`, `item_collected`, `player_connected`, `player_action`

---

## Tarefas Assíncronas (Celery)

### Tarefas sob demanda

| Tarefa | Descrição |
|---|---|
| `accounts.tasks.send_email_task` | Envio assíncrono de e-mails |
| `game_logic.tasks.deliver_quest_rewards` | Entrega assíncrona e idempotente de recompensas de quest |

### Agenda periódica (`CELERY_BEAT_SCHEDULE`)

| Tarefa | Intervalo | Descrição |
|---|---|---|
| `rebuild_leaderboard_cache` | 10 min | Reconstrói o Sorted Set Redis a partir do Postgres |
| `cleanup_stale_game_sessions` | 2 min | Fecha sessões sem heartbeat há mais de 60 s |
| `cleanup_expired_otps` | 6 h | Remove códigos OTP expirados |

> O agendamento via **DatabaseScheduler** (django-celery-beat) permite sobrescrever os intervalos pelo Django Admin em `/admin/` sem reiniciar o container.

---

## API — Referência Completa

Base URL: `http://localhost:8000/api/v1/`

### Accounts

| Método | Endpoint | Acesso | Descrição |
|---|---|---|---|
| POST | `/accounts/auth/register/` | Público | Registro de usuário |
| POST | `/accounts/auth/login/` | Público | Login — retorna `access` + `refresh` JWT |
| POST | `/accounts/auth/token/refresh/` | Público | Renova access token |
| POST | `/accounts/auth/logout/` | Auth | Blacklist do refresh token |
| GET/PUT | `/accounts/profile/` | Auth | Perfil do usuário logado |
| POST | `/accounts/change-password/` | Auth | Troca de senha |
| POST | `/accounts/email/verify/` | Público | Verificação por OTP |
| POST | `/accounts/password/reset/request/` | Público | Solicitar reset por OTP |
| POST | `/accounts/password/reset/confirm/` | Público | Confirmar reset com OTP |
| GET | `/accounts/admin/diagnostics/` | Admin | Diagnóstico completo do sistema |

### Blog

| Método | Endpoint | Acesso | Descrição |
|---|---|---|---|
| GET | `/blog/public/posts/` | Público | Posts publicados (paginado, SSR-friendly) |
| GET | `/blog/public/posts/<slug>/` | Público | Detalhe do post |
| GET | `/blog/public/categories/` | Público | Categorias com contagem de posts |
| GET | `/blog/public/tags/` | Público | Tags |
| GET | `/blog/public/comments/?post=<id>` | Público | Comentários aprovados de um post |
| POST | `/blog/public/comments/` | Auth | Criar comentário |
| * | `/blog/posts/` | Auth | CRUD de posts + workflow |

### Forum

| Método | Endpoint | Acesso | Descrição |
|---|---|---|---|
| GET | `/forum/public/categories/` | Público | Categorias ativas |
| GET | `/forum/public/topics/` | Público | Lista de tópicos |
| GET | `/forum/public/topics/<slug>/with_replies/` | Público | Tópico com replies |
| GET | `/forum/public/topics/<slug>/reactions/` | Público | Reações do tópico |
| GET | `/forum/public/replies/?topic=<slug>` | Público | Replies de um tópico |
| POST | `/forum/topics/` | Auth | Criar tópico |
| POST | `/forum/replies/` | Auth | Criar reply |
| POST | `/forum/replies/<id>/react/` | Auth | Reagir a reply |
| POST | `/forum/topic-reactions/` | Auth | Reagir a tópico |
| POST | `/forum/topics/<slug>/pin/` | Mod | Fixar tópico |
| POST | `/forum/topics/<slug>/close/` | Mod | Fechar tópico |

### Game Data (público)

| Método | Endpoint | Filtros | Descrição |
|---|---|---|---|
| GET | `/game-data/items/` | `rarity`, `item_type`, `min_level`, `max_level`, `search`, `ordering` | Templates de itens |
| GET | `/game-data/skills/` | `skill_type`, `search`, `ordering` | Templates de skills |
| GET | `/game-data/maps/` | — | Mapas habilitados |
| GET | `/game-data/bootstrap/` | `since=<iso>` | Delta completo para Unity (itens + skills + mapas) |
| GET | `/game-data/manifest/` | — | ETag para detecção de mudanças (suporta `304`) |

### Game Logic (autenticado)

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/game-logic/` | Instâncias do jogador (inventory + stats) |
| GET | `/game-logic/inventory/` | Inventário completo |
| POST | `/game-logic/inventory/` | Adicionar item (admin only) |
| DELETE | `/game-logic/inventory/<slot>/` | Remover item por slot |
| GET | `/game-logic/stats/` | Stats do jogador |
| POST | `/game-logic/stats/allocate/` | Alocar pontos de atributo |
| POST | `/game-logic/stats/gain-xp/` | Conceder XP (admin only) |
| GET | `/game-logic/skills/` | Skills do jogador |
| POST | `/game-logic/skills/` | Aprender skill (admin only) |
| GET | `/game-logic/quests/` | Progresso de quests do jogador |
| POST | `/game-logic/quests/` | Iniciar quest |
| POST | `/game-logic/quests/complete/` | Completar quest + entrega de recompensas |
| GET | `/game-logic/quest-templates/` | Templates públicos de quests (`?level=`, `?quest_type=`) |
| GET | `/game-logic/leaderboard/` | Ranking Redis (`?limit=100`) |
| POST | `/game-logic/session/` | Iniciar sessão de jogo |
| DELETE | `/game-logic/session/` | Encerrar sessão de jogo |
| POST | `/game-logic/webhook/` | Webhook do GameServer (HMAC-SHA256) |

### Health

| Endpoint | Descrição |
|---|---|
| `GET /health/live/` | Liveness — 200 se o processo está vivo |
| `GET /health/ready/` | Readiness — 200 se DB + Redis estão acessíveis |
| `GET /health/version/` | Versão, SHA e data do build |

### WebSocket

| Endpoint | Descrição |
|---|---|
| `ws://host:8000/ws/game/<session_id>/` | Canal de jogo em tempo real (Django Channels) |

---

## Comandos de Gerenciamento

```bash
# Popula o banco com dados de desenvolvimento
python manage.py seed_dev

# Remove OTPs expirados (também executado automaticamente pelo Celery)
python manage.py cleanup_otps --days 7

# Garante que o usuário de suporte existe
python manage.py ensure_support_user
```

---

## Testes

```bash
cd backend
source venv/Scripts/activate   # Windows
# source venv/bin/activate     # Linux/Mac

pytest -q                      # todos os testes (147 atualmente)
pytest apps/game_logic/ -q     # módulo específico
pytest --cov=apps --cov-report=term-missing  # com cobertura
```
