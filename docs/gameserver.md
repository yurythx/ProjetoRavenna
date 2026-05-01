# Game Server — C# / .NET 8

Servidor autoritativo de alta performance para lógica de jogo em tempo real.

---

## Stack

| Componente | Tecnologia |
|---|---|
| Runtime | .NET 8 (C#) |
| Networking | UDP puro + **KCP** (confiabilidade sobre UDP) |
| Serialização | Protobuf (Google.Protobuf) |
| Autenticação | JWT RS256 — valida tokens offline com `public.pem` |
| Integração | HTTP para backend Django (DjangoBridge + HMAC) |

---

## Estrutura

```
gameserver/src/RavennaServer/
├── Network/
│   ├── UdpSocketListener.cs    # Escuta UDP porta 7777, demultiplexa pacotes por endpoint
│   └── KcpConnection.cs        # Confiabilidade KCP por conexão
├── Simulation/
│   ├── SimulationLoop.cs       # Loop autoritativo (30 Hz), processa inputs e emite snapshots
│   ├── PlayerState.cs          # Estado em memória de cada jogador conectado
│   └── SpatialGrid.cs          # Grid espacial para interest management
├── Bridge/
│   └── DjangoBridge.cs         # Envia webhooks assinados por HMAC para o backend Django
├── Auth/
│   └── JwtValidator.cs         # Valida JWT RS256 com a chave pública RSA
└── Proto/
    └── game_messages.proto     # Definições Protobuf (sincronizado com proto/)
```

---

## Ciclo de Vida do Jogador

```
Cliente Unity                    Game Server                  Backend Django
     │                               │                              │
     │── C2S_Handshake (JWT) ───────►│                              │
     │                               │ valida JWT (public.pem)      │
     │◄─ S2C_HandshakeAck ───────────│                              │
     │                               │── player_connected ─────────►│
     │                               │   (HMAC webhook)             │
     │── C2S_Move / C2S_Action ─────►│                              │
     │                               │ processa input, atualiza     │
     │                               │ PlayerState em memória       │
     │◄─ S2C_WorldSnapshot ──────────│                              │
     │   (30 Hz, apenas entidades    │                              │
     │   dentro do raio de visão)    │                              │
     │                               │── xp_gained / item_collected►│
     │                               │   (eventos de progresso)     │
     │── desconexão ────────────────►│                              │
     │                               │── player_disconnected ──────►│
```

---

## Webhooks para o Backend

O GameServer envia eventos via `DjangoBridge` usando `POST /api/v1/game-logic/webhook/`.  
Cada chamada inclui o header `X-Webhook-Secret` com HMAC-SHA256 do corpo.

| Evento | Payload | Efeito no Backend |
|---|---|---|
| `player_connected` | `hwid`, `ip_address`, `map_key` | Cria `GameSession` |
| `xp_gained` | `amount` | Chama `gain_experience()` |
| `item_collected` | `item_template_id`, `quantity` | Chama `add_item_to_inventory()` |
| `player_action` | `action_id` (1=melee, 2=ranged, 3=skill, 4=pickup) | XP por ação |

---

## Segurança

| Mecanismo | Implementação |
|---|---|
| **Autenticação** | JWT RS256 validado localmente (sem chamada ao banco) |
| **Anti-speedhack** | Validação de velocidade máxima no SimulationLoop |
| **Anti-teleport** | Delta de posição verificado contra threshold por tick |
| **Interest Management** | SpatialGrid filtra entidades fora do raio do jogador — previne wallhack |
| **Webhook** | Assinatura HMAC-SHA256; backend usa `hmac.compare_digest` para evitar timing attacks |

---

## Configuração

Variáveis de ambiente (container `ravenna_gameserver`):

| Variável | Padrão | Descrição |
|---|---|---|
| `DJANGO_URL` | `http://web:8000` | URL do backend |
| `DJANGO_WEBHOOK_SECRET` | `ravenna-secret-123` | HMAC secret (deve coincidir com o backend) |
| `JWT_PUBLIC_KEY_PATH` | `/app/keys/public.pem` | Caminho para chave pública RSA |
| `GAMESERVER_UDP_PORT` | `7777` | Porta UDP |
| `WORLD_WIDTH` / `WORLD_HEIGHT` | `10000` | Dimensões do mundo em cm |
| `SPATIAL_CELL_SIZE` | `5000` | Tamanho da célula do grid espacial (50 m) |
| `TICK_RATE_HZ` | `30` | Frequência da SimulationLoop |

---

## Build Local

```bash
cd gameserver
dotnet restore
dotnet build --configuration Release
dotnet run --project src/RavennaServer
```

---

## Protobuf

As definições em `proto/game_messages.proto` são a fonte da verdade para o protocolo binário.

Recompilar após alterações:
```bash
protoc --csharp_out=gameserver/src/RavennaServer/Proto proto/game_messages.proto
```

Mensagens principais:

| Mensagem | Direção | Descrição |
|---|---|---|
| `C2S_Handshake` | Client → Server | JWT de autenticação |
| `C2S_Move` | Client → Server | Input de movimento |
| `C2S_Action` | Client → Server | Ação (ataque, skill, pickup) |
| `S2C_HandshakeAck` | Server → Client | Confirmação de handshake |
| `S2C_WorldSnapshot` | Server → Client | Estado do mundo (30 Hz) |
| `S2C_EventBroadcast` | Server → Client | Evento de jogo (dano, morte, etc.) |
