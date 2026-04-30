# Projeto Ravenna - Backend

Backend Django REST Framework para o jogo Projeto Ravenna.

## Stack Tecnológica

- **Framework**: Django 5.x + Django REST Framework
- **Banco de Dados**: PostgreSQL
- **Cache**: Redis
- **Autenticação**: JWT com chaves RSA (RS256) + blacklist de refresh tokens
- **Containerização**: Docker

## Estrutura do Projeto

```
backend/
├── core/                 # Configuração Django
│   ├── settings.py
│   ├── urls.py
│   ├── wsgi.py
│   └── asgi.py
├── apps/                 # Aplicações Django
│   ├── common/           # UUIDModel (base)
│   ├── accounts/         # Usuários e autenticação
│   ├── blog/             # Notícias e posts
│   ├── forum/            # Sistema de fórum
│   ├── game_data/        # Templates de itens/skills/mapas
│   └── game_logic/       # Instâncias de jogadores
├── keys/                 # Chaves RSA
├── manage.py
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
```

## Setup (Local)

### Windows

```bash
cd backend
.\setup.bat
```

### Linux/Mac

```bash
cd backend
chmod +x setup.sh
./setup.sh
```

### Manual

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
.\venv\Scripts\activate   # Windows
pip install -r requirements.txt
python keys/generate_keys.py
cp .env.example .env
```

## Configuração

1. Edite o arquivo `.env`:
```env
DJANGO_SECRET_KEY=sua-chave-secreta-aqui
DEBUG=True
POSTGRES_DB=projeto_ravenna
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
```

### JWT RSA (chaves)

O backend suporta chaves RSA de duas formas:
- **Via arquivos** (padrão): `backend/keys/private.pem` e `backend/keys/public.pem`
- **Via variáveis de ambiente** (recomendado em produção):
  - `JWT_PRIVATE_KEY` (PEM completo)
  - `JWT_PUBLIC_KEY` (PEM completo)
  - ou `JWT_PRIVATE_KEY_PATH` / `JWT_PUBLIC_KEY_PATH` (caminhos)

Em `DEBUG=True`, se as chaves não existirem, elas são geradas automaticamente no boot (requer `cryptography`).

O script `python keys/generate_keys.py` não sobrescreve as chaves se elas já existirem.

2. Execute as migrations:
```bash
python manage.py migrate
```

3. Crie um superusuário:
```bash
python manage.py createsuperuser
```

4. Inicie o servidor:
```bash
python manage.py runserver
```

## Docker

```bash
cd backend
docker-compose up -d
docker-compose exec web python manage.py createsuperuser
```

## APIs Disponíveis

Paginação padrão do DRF: `?page=1` (page size padrão: 20).

### Accounts

| Endpoint | Descrição |
|----------|-----------|
| `POST /api/accounts/register/` | Registro de usuário |
| `POST /api/accounts/login/` | Login (retorna JWT) |
| `POST /api/accounts/logout/` | Logout (blacklist do refresh token) |
| `POST /api/accounts/token/refresh/` | Refresh JWT |
| `POST /api/accounts/token/verify/` | Verify JWT |
| `GET /api/accounts/profile/` | Perfil do usuário |
| `PUT /api/accounts/profile/` | Atualizar perfil do usuário |
| `POST /api/accounts/change-password/` | Trocar senha do usuário |
| `GET /api/accounts/me/` | Retorna info do usuário atual |
| `POST /api/accounts/password-reset/` | Solicitar reset de senha |
| `POST /api/accounts/password-reset/confirm/` | Confirmar reset de senha |

### Blog

| Endpoint | Descrição |
|----------|-----------|
| `GET /api/blog/posts/` | Lista de posts |
| `GET /api/blog/categories/` | Lista de categorias |
| `GET /api/blog/tags/` | Lista de tags |

### Fórum

| Endpoint | Descrição |
|----------|-----------|
| `GET /api/forum/categories/` | Lista de categorias ativas |
| `POST /api/forum/categories/` | Criar categoria (moderador) |
| `GET /api/forum/topics/` | Lista de tópicos |
| `POST /api/forum/topics/` | Criar tópico (player/admin) |
| `GET /api/forum/topics/{slug}/` | Detalhe do tópico |
| `GET /api/forum/topics/{slug}/with_replies/` | Tópico com replies |
| `POST /api/forum/topics/{slug}/pin/` | Fixar tópico (moderador) |
| `POST /api/forum/topics/{slug}/unpin/` | Desafixar tópico (moderador) |
| `POST /api/forum/topics/{slug}/close/` | Fechar tópico (moderador) |
| `POST /api/forum/topics/{slug}/open/` | Reabrir tópico (moderador) |
| `POST /api/forum/topics/{slug}/archive/` | Arquivar tópico (moderador) |
| `GET /api/forum/topics/{slug}/reactions/` | Resumo de reações do tópico |
| `GET /api/forum/replies/` | Lista de replies (aceita `?topic={slug}`) |
| `POST /api/forum/replies/` | Criar reply (player/admin) |
| `POST /api/forum/replies/{id}/mark_solution/` | Marcar solução (moderador) |
| `POST /api/forum/replies/{id}/hide/` | Ocultar reply (moderador) |
| `POST /api/forum/replies/{id}/react/` | Reagir ao reply |
| `POST /api/forum/topic-reactions/` | Reagir ao tópico (`topic_id`) |

### Game Data (público)

| Endpoint | Descrição |
|----------|-----------|
| `GET /api/game-data/items/` | Templates de itens |
| `GET /api/game-data/skills/` | Templates de skills |
| `GET /api/game-data/maps/` | Dados de mapas (somente `is_enabled=True`) |

### Game Logic (autenticado)

| Endpoint | Descrição |
|----------|-----------|
| `GET /api/game-logic/` | Instâncias do jogador (inventory + stats) |
| `GET /api/game-logic/inventory/` | Inventário do jogador |
| `POST /api/game-logic/inventory/` | Adicionar item (server-side) |
| `DELETE /api/game-logic/inventory/{slot_index}/` | Remover item por slot |
| `GET /api/game-logic/stats/` | Estatísticas do jogador |
| `PUT /api/game-logic/stats/` | Atualizar vitals (health/mana) |
| `POST /api/game-logic/stats/allocate/` | Alocar pontos (usa `points_remaining`) |
| `POST /api/game-logic/stats/gain-xp/` | Conceder XP (somente admin) |
| `GET /api/game-logic/quests/` | Lista de quests do jogador |
| `POST /api/game-logic/quests/` | Iniciar quest |
| `POST /api/game-logic/quests/complete/` | Completar quest |
| `GET /api/game-logic/skills/` | Lista de skills do jogador |
| `POST /api/game-logic/skills/` | Aprender skill |

## Fluxo de Autenticação (Deep Link)

1. Unity abre o navegador no Next.js
2. Next.js autentica no DRF
3. DRF gera JWT RSA
4. Next.js redireciona: `ravenna-game://auth?token={JWT}`
5. Unity captura o token e inicia socket KCP
