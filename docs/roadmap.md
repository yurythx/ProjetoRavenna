# Roadmap de Implementação — Projeto Ravenna

> Documento gerado em 2026-05-01. Reflete o estado real do código após a sessão 3 (combat system).
> Atualizar este arquivo a cada sprint concluída.

---

## Estado Atual por Camada

| Camada | Progresso | Observação |
|---|---|---|
| Backend Django | ~96% | Auth, blog, fórum, game_logic, WebSocket, Celery completos |
| Frontend Next.js | ~88% | Falta skills page, HUD combate, marketplace, guildas |
| Game Server C# | ~85% | KCP/UDP + combat system implementados; falta skills, ranged, mapas |
| Infra / DevOps | ~75% | docker-compose.prod.yml existe; falta SSL script, monitoramento |

---

## Fase 1 — Bugs Críticos (estado quebrado hoje)

### 1.1 `player_disconnected` não vai ao Django

**Problema:** `SimulationLoop.OnPlayerDisconnected` remove a sessão da memória mas nunca dispara webhook. A `GameSession` no banco fica com `status="active"` para sempre — o Celery Beat a fecha só depois de 2 min (dirty).

**Arquivos:**
- `gameserver/src/RavennaServer/Simulation/SimulationLoop.cs` — adicionar `SendEventAsync("player_disconnected")` em `OnPlayerDisconnected`
- `backend/apps/game_logic/views.py` — adicionar handler `elif event_type == "player_disconnected"` chamando `GameLogicService.end_game_session(user)`

**Critério de conclusão:** `GameSession.status` muda para `"ended"` imediatamente ao desconectar, sem depender do Celery.

---

### 1.2 `player_killed` ignorado pelo Django

**Problema:** `SimulationLoop` envia `player_killed` com `victim_user_id`, mas o webhook view não tem handler — cai silenciosamente no print final sem persistir nada.

**Arquivos:**
- `backend/apps/game_logic/views.py` — adicionar handler `elif event_type == "player_killed"` (registrar kill no `PlayerStats` do killer, morte no stats da vítima)
- `backend/apps/game_logic/models.py` — verificar se `PlayerStats` tem campos `kills` / `deaths` (adicionar se não tiver)
- `backend/apps/game_logic/services.py` — método `record_pvp_kill(killer, victim)`
- Migration necessária se novos campos forem adicionados

**Critério de conclusão:** Kills e mortes PvP persistidos no banco. Stat visível no `/me`.

---

### 1.3 Player morto fica morto para sempre

**Problema:** Ao receber dano fatal, `State = Dead` é setado no servidor em memória mas não existe mecanismo de respawn para jogadores (NPCs têm `RespawnDelayMs`, jogadores não).

**Arquivos:**
- `gameserver/src/RavennaServer/Simulation/SimulationLoop.cs` — adicionar tick de respawn: após `PLAYER_RESPAWN_MS` (ex: 10s), resetar HP, `State = Idle`, mover para spawn point
- `gameserver/src/RavennaServer/Simulation/EntityState.cs` — adicionar `DeathTimeMs` e `SpawnPoint` ao `PlayerSession`

**Critério de conclusão:** Player morto reaparece no spawn point após 10s com HP cheio.

---

### 1.4 DEPLOYMENT.md documenta endpoint errado

**Problema:** Doc diz `/api/v1/game-logic/webhook/` mas o endpoint real é `/api/v1/game-logic/events/`.

**Arquivo:** `DEPLOYMENT.md` — corrigir linha da tabela de rotas do webhook.

---

## Fase 2 — Funcionalidades pela Metade

### 2.1 Skill System no Game Server

**Descrição:** Combate atual só tem auto-attack. O jogador precisa conseguir usar habilidades (`skill_id`) com cooldown individual por skill.

**Fluxo esperado:**
```
Cliente envia C2S_UseSkill { skill_id, target_id }
→ Servidor verifica cooldown da skill
→ Aplica efeito (dano, heal, buff) com multiplicador da skill
→ Inicia cooldown individual
→ Envia webhook "use_skill" ao Django (XP = 10)
→ Broadcast S2C_DamageEvent com skill_id preenchido
```

**Arquivos:**
- `proto/game_messages.proto` — adicionar `C2S_UseSkill { uint32 skill_id, uint32 target_id }`; estender `S2C_DamageEvent` com `uint32 skill_id`
- `gameserver/src/RavennaServer/Simulation/SkillRegistry.cs` (NOVO) — mapa `skill_id → SkillDefinition { damage_multiplier, range, cooldown_sec, aoe_radius }`
- `gameserver/src/RavennaServer/Simulation/EntityState.cs` — adicionar `Dictionary<uint, long> SkillCooldowns` ao `PlayerSession`
- `gameserver/src/RavennaServer/Simulation/SimulationLoop.cs` — handler para `0x06` (C2S_UseSkill)

**Critério de conclusão:** Habilidade com cooldown funciona; cooldown diferente para cada skill; XP persistido no Django.

---

### 2.2 Página `/game-data/skills` no Frontend

**Descrição:** Itens e quests têm browse com filtros — skills não têm. API já existe: `GET /api/v1/game-data/skills/?skill_type=&search=&ordering=`.

**Arquivo:** `frontend/src/app/game-data/skills/page.tsx` (NOVO)

**Critério de conclusão:** Listagem com filtro por `skill_type`, search, cards com nome/descrição/tipo.

---

### 2.3 Testes faltando

| Arquivo de teste | O que cobrir |
|---|---|
| `backend/apps/game_logic/tests/test_views.py` | `GameEventWebhookView`: `player_disconnected`, `player_killed`, HMAC inválido |
| `frontend/src/app/leaderboard/leaderboard.test.tsx` (NOVO) | Render do podium, highlight do jogador atual |
| `frontend/src/app/game-data/quests/quests.test.tsx` (NOVO) | Filtro por tipo, cards de recompensa |

---

### 2.4 NPCs carregados do Django (game_data)

**Descrição:** NPCs estão hardcoded em `Program.cs`. Precisam vir do banco via API em `GET /api/v1/game-data/npcs/` (ou do endpoint `bootstrap`).

**Arquivos:**
- `backend/apps/game_data/models.py` — adicionar `NpcTemplate` (name, npc_type, hp, damage, speed, aggro_range, xp_reward, spawn_positions JSON)
- `backend/apps/game_data/views.py` — endpoint `GET /api/v1/game-data/npcs/`
- `gameserver/src/RavennaServer/Bridge/DjangoBridge.cs` — método `FetchNpcTemplatesAsync()` no startup
- `gameserver/src/RavennaServer/Program.cs` — substituir hardcode por fetch do Django

**Critério de conclusão:** Adicionar/mover NPCs pelo Django Admin sem recompilar o servidor.

---

### 2.5 Map Walkability (NavMesh simplificado)

**Descrição:** Servidor aceita qualquer destino sem checar obstáculos. Jogadores atravessam paredes.

**Abordagem:** Bitmap de walkability por mapa (grid booleano carregado do Django junto com `NpcTemplate`). `MovementController.SetDestination` rejeita destinos não-walkable.

**Arquivos:**
- `backend/apps/game_data/models.py` — campo `walkability_map` (base64 PNG ou JSON grid) no `Map`
- `gameserver/src/RavennaServer/Simulation/WalkabilityGrid.cs` (NOVO)
- `gameserver/src/RavennaServer/Simulation/MovementController.cs` — validar destino antes de aceitar

---

## Fase 3 — Sistemas Novos

### 3.1 Marketplace / Trading

**Backend:**
- Model `MarketplaceListing { seller, item_template, quantity, price_gold, status, expires_at }`
- `GameLogicService.create_listing()`, `buy_listing()` — atômico com `select_for_update()`
- Endpoints: `GET/POST /api/v1/marketplace/listings/`, `POST /api/v1/marketplace/listings/<id>/buy/`

**Frontend:**
- Página `/marketplace` — grid de itens à venda, filtros por tipo/raridade/preço, botão comprar

**Critério de conclusão:** Player pode listar item do inventário para venda; outro player compra; gold transferido atomicamente; item migra de inventário.

---

### 3.2 Guildas

**Backend:**
- Models `Guild`, `GuildMember { rank: leader/officer/member }`
- Endpoints: criar guilda, convidar membro, expulsar, listar membros, ranking de guildas (soma XP dos membros)

**Frontend:**
- Página `/guilds` — lista de guildas, página de detalhe com membros e ranking

---

### 3.3 Chat In-Game via WebSocket

**Descrição:** Django Channels já está configurado (redis/3). Falta um Consumer de chat.

**Backend:**
- `ChatConsumer` em `apps/game_logic/consumers.py` — canais por mapa (`map_<key>`) e global
- Route em `core/asgi.py`

**Frontend:**
- Widget de chat flutuante na página do jogo (conecta ao WS `/ws/chat/<map_key>/`)

---

### 3.4 Ranged Combat / Projéteis

**Descrição:** Arqueiros e magos precisam de projéteis com tempo de voo e hitbox.

**Game Server:**
- `ProjectileEntity` — posição, velocidade, dano, TTL em ticks
- `ProjectileManager` — tick de movimento + detecção de colisão vs entidades no SpatialGrid
- `S2C_ProjectileSpawned`, `S2C_ProjectileHit` no proto

---

## Tabela de Prioridades

| # | Item | Fase | Esforço | Impacto |
|---|---|---|---|---|
| 1 | `player_disconnected` webhook | 1 | Pequeno | Alto — corrige dado sujo no banco |
| 2 | `player_killed` handler | 1 | Pequeno | Alto — PvP sem consequência hoje |
| 3 | Player respawn | 1 | Pequeno | Alto — jogador preso na morte |
| 4 | Fix doc DEPLOYMENT.md | 1 | Trivial | Médio |
| 5 | Skill system game server | 2 | Médio | Alto — combate muito raso sem skills |
| 6 | `/game-data/skills` page | 2 | Pequeno | Médio |
| 7 | Testes webhook + novas pages | 2 | Médio | Alto — coverage zerada em código novo |
| 8 | NPCs do Django | 2 | Médio | Médio — viabiliza edição de conteúdo |
| 9 | Walkability grid | 2 | Grande | Médio — melhora anti-cheat mas complexo |
| 10 | Marketplace | 3 | Grande | Alto — monetização / economia do jogo |
| 11 | Guildas | 3 | Grande | Médio |
| 12 | Chat in-game | 3 | Médio | Médio |
| 13 | Ranged combat | 3 | Grande | Alto — arquétipos de personagem |

---

## Protocolo de Mensagens (Game Server ↔ Unity Client)

Tabela de referência para o cliente Unity. Prefixo de 1 byte precede cada mensagem KCP.

### Client → Server

| Byte | Mensagem Proto | Campos principais |
|---|---|---|
| `0x01` | `C2S_Move` (legacy) | `x, y, sequence` |
| `0x02` | `C2S_Action` (legacy) | `action_id, target_id` |
| `0x03` | `C2S_MoveTo` | `dest_x, dest_y, sequence` |
| `0x04` | `C2S_AttackTarget` | `target_id, sequence` |
| `0x05` | `C2S_StopAction` | `sequence` |
| `0x06` | `C2S_UseSkill` *(fase 2)* | `skill_id, target_id` |
| `0xFF` | Heartbeat / ping | *(sem payload)* |

### Server → Client

| Byte | Mensagem Proto | Quando |
|---|---|---|
| `0x10` | `S2C_WorldSnapshot` | Todo tick (30 Hz), entidades no raio de visão |
| `0x11` | `S2C_DamageEvent` | A cada hit; broadcast para vizinhos |
| `0x12` | `S2C_EntityDied` | Ao morrer; broadcast para vizinhos |
| `0x13` | `S2C_CombatStateChanged` | Ao mudar de estado (Idle/Chasing/Attacking) |
| `0x20` | `S2C_Event` (kick) | Timeout, HWID conflict, ban |

---

## Webhooks Game Server → Django

Endpoint: `POST /api/v1/game-logic/events/`  
Autenticação: header `X-Webhook-Secret: <HMAC-SHA256 do body>`

| `event_type` | `data` relevante | Efeito no Django |
|---|---|---|
| `player_connected` | `hwid`, `ip_address`, `map_key` | Cria `GameSession` |
| `player_disconnected` | — | Fecha `GameSession` *(fase 1)* |
| `xp_gained` | `amount` | `gain_experience()` |
| `item_collected` | `item_template_id`, `quantity` | `add_item_to_inventory()` |
| `player_action` | `action_id` | XP por ação |
| `player_killed` | `victim_user_id` | Registra kill/morte no `PlayerStats` *(fase 1)* |
| `use_skill` | `skill_id` | XP = 10 *(fase 2)* |
