# Arquitetura Técnica — Projeto Ravenna

---

## Visão Geral dos Componentes

```
                ┌─────────────────────────────────────────┐
                │           Browser / Unity Client         │
                └──────┬─────────────────────────┬────────┘
                       │ HTTPS/WSS               │ KCP/UDP
                       ▼                         ▼
              ┌────────────────┐       ┌─────────────────┐
              │  Next.js 15    │       │  Game Server     │
              │  (porta 3000)  │       │  C# / .NET 8     │
              │  Portal Web    │       │  (porta 7777)    │
              └───────┬────────┘       └────────┬────────┘
                      │ REST/JSON               │ Webhook HMAC
                      ▼                         ▼
              ┌────────────────────────────────────────────┐
              │           Django API (porta 8000)           │
              │  DRF REST + Django Channels (WebSocket)    │
              ├────────────────────────────────────────────┤
              │  PostgreSQL 16     │  Redis 7               │
              │  (estado final)    │  (leaderboard, cache,  │
              │                    │   filas, WebSocket)    │
              └────────────────────────────────────────────┘
```

---

## Fluxo de Sessão de Jogo

### 1. Autenticação
1. Jogador faz `POST /api/v1/accounts/auth/login/`
2. Backend emite **JWT RS256** com `user_id` assinado por `private.pem`
3. Token é armazenado no frontend como cookie httpOnly

### 2. Handshake no GameServer
1. Cliente Unity conecta via UDP na porta 7777
2. Envia JWT no handshake (mensagem `C2S_Handshake`, Protobuf)
3. GameServer valida a assinatura usando `public.pem` (sem chamada ao banco)
4. Cria `PlayerState` em memória e inicia loop de simulação

### 3. Simulação Autoritativa (30 Hz)
1. Cliente envia inputs (`C2S_Action`, `C2S_Move`)
2. SimulationLoop valida e aplica no estado canônico
3. Servidor emite `S2C_WorldSnapshot` com estado de todos os jogadores visíveis

### 4. Sincronização de Progresso
O GameServer envia eventos ao Backend via `DjangoBridge` (HTTP POST com HMAC):

| Evento | Efeito no Backend |
|---|---|
| `xp_gained` | `GameLogicService.gain_experience()` |
| `item_collected` | `GameLogicService.add_item_to_inventory()` |
| `player_connected` | `GameLogicService.start_game_session()` |
| `player_action` | XP por ação (melee=5, skill=10, pickup=2) |

### 5. Conclusão de Quests
Quando o jogador completa uma quest:
1. `GameLogicService.complete_quest(user, quest_id)` é chamado
2. Busca o `QuestTemplate` pelo UUID
3. Entrega recompensas atomicamente (XP via `gain_experience`, gold no inventário, itens via `add_item_to_inventory`)
4. Quests `is_repeatable=True` têm status resetado automaticamente

### 6. Leaderboard em Tempo Real
- `gain_experience()` chama `update_leaderboard_cache()` após cada XP grant
- Redis Sorted Set com score = `level × 1_000_000 + experience`
- Leitura via `ZREVRANGE` (O(log N + M))
- Reconstrução periódica pelo Celery Beat (a cada 10 min) como fallback

---

## Segurança

### Anti-Cheat
| Camada | Mecanismo |
|---|---|
| **HWID Tracking** | Usuário vinculado ao hardware; mudança detectada |
| **XP Throttle** | Deltas acima de 10.000 XP/requisição rejeitados (bypass apenas para recompensas de quest) |
| **Interest Management** | GameServer filtra entidades fora do raio de visão, prevenindo wallhack |
| **Validação de movimento** | Velocidade e teleporte verificados server-side |
| **Webhook HMAC** | GameServer assina o corpo de cada webhook; backend valida com `hmac.compare_digest` |

### Concorrência
- Todas as escritas em recursos compartilhados (inventário, stats, gold) usam `select_for_update()` dentro de `@transaction.atomic`
- Suporta múltiplos containers de API em paralelo sem race conditions

### Autenticação entre Serviços
```
Backend ──(private.pem)──► assina JWT
GameServer ──(public.pem)──► valida JWT (offline, sem banco)
```
A chave pública é compartilhada via volume Docker `keys_data`.

---

## Fluxo do Portal Web

```
Browser                Next.js              Django API         Redis
  │                       │                     │                │
  │── GET /blog ──────────►│                     │                │
  │                       │── GET /api/v1/blog ─►│                │
  │                       │◄─ posts JSON ────────│                │
  │◄─ HTML renderizado ───│                     │                │
  │                       │                     │                │
  │── GET /me ────────────►│                     │                │
  │                       │── GET /api/v1/      ─►│                │
  │                       │   game-logic/        │                │
  │                       │◄─ stats + inventory ─│                │
  │                       │                     │                │
  │── GET /leaderboard ───►│                     │                │
  │                       │── GET /api/v1/      ─►│─ ZREVRANGE ───►│
  │                       │   game-logic/        │◄─ top-100 ─────│
  │                       │   leaderboard/       │                │
  │◄─ ranking page ───────│◄─ [{rank,name,score}]│                │
```

---

## Tarefas Periódicas

```
Celery Beat (a cada N)
  │
  ├── 2 min ──► cleanup_stale_game_sessions
  │             Fecha sessões sem heartbeat > 60s
  │
  ├── 10 min ─► rebuild_leaderboard_cache
  │             Reconstrói Redis Sorted Set a partir do Postgres
  │             (recuperação de falha ou restart do Redis)
  │
  └── 6 h ────► cleanup_expired_otps
                Remove códigos OTP expirados do banco
```
