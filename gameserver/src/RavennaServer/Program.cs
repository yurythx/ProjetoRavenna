// =============================================================================
// Program.cs — Ponto de entrada do RavennaServer (servidor headless C#)
// =============================================================================
//
// Este arquivo cria e conecta todos os subsistemas do servidor de jogo.
// Não contém lógica própria — apenas lê variáveis de ambiente, instancia
// as dependências na ordem correta e aguarda o cancelamento via Ctrl+C.
//
// Arquitetura de alto nível:
//
//   ┌──────────────────────────────────────────────────────────────┐
//   │                    RavennaServer                             │
//   │                                                              │
//   │   UdpSocketListener  ──→  SimulationLoop  ──→  DjangoBridge │
//   │        ↑ recebe UDP            ↓ ticks 30 Hz      ↓ HTTP    │
//   │   KcpConnection (por          NpcManager          eventos   │
//   │   jogador conectado)          SpatialGrid         persistência│
//   │                                                              │
//   │   JwtValidator — valida handshake offline (RSA/RS256)        │
//   │   HealthServer — HTTP :7778 para health check do Docker      │
//   └──────────────────────────────────────────────────────────────┘
//
// Variáveis de Ambiente:
//   UDP_PORT             (default: 7777) — porta UDP do servidor
//   HEALTH_PORT          (default: 7778) — porta HTTP do health check
//   DJANGO_URL           (default: http://localhost:8001) — URL do backend
//   JWT_PUBLIC_KEY_PATH  (default: /app/keys/public.pem) — chave pública RSA
//   DJANGO_WEBHOOK_SECRET (default: changeme) — segredo HMAC dos webhooks
//   WORLD_WIDTH/HEIGHT   (default: 10000 cm cada) — dimensões do mundo
//   SPATIAL_CELL_SIZE    (default: 1500 cm) — tamanho das células do grid
//   NPC_SPAWNS_PATH      (default: /app/config/spawns.json) — config de spawns
//
// Como conectar o Unity:
//   1. O cliente Unity envia um pacote UDP com magic prefix 0xCAFE1337
//      contendo um JWT do tipo "unity_auth" (obtido em /api/v1/auth/game-token/).
//   2. O servidor valida o JWT offline, busca o estado em /game-state/<userId>/
//      e cria uma PlayerSession com KCP.
//   3. Após o handshake, todo tráfego é KCP/Protobuf sobre UDP.
//
// Para rodar localmente:
//   docker compose up gameserver
//   # ou
//   cd gameserver && dotnet run
// =============================================================================
using RavennaServer;
using RavennaServer.Bridge;
using RavennaServer.Network;
using RavennaServer.Simulation;

var cts = new CancellationTokenSource();
Console.CancelKeyPress += (_, e) => { e.Cancel = true; cts.Cancel(); };

// ── Config from environment ───────────────────────────────────────────────────
int    udpPort    = int.Parse(Env("UDP_PORT",             "7777"));
int    healthPort = int.Parse(Env("HEALTH_PORT",          "7778"));
string djangoUrl  = Env("DJANGO_URL",                     "http://localhost:8001");
string keyPath    = Env("JWT_PUBLIC_KEY_PATH",            "/app/keys/public.pem");
string hookSecret = Env("DJANGO_WEBHOOK_SECRET",          "changeme");
int    worldW     = int.Parse(Env("WORLD_WIDTH",          "10000"));
int    worldH     = int.Parse(Env("WORLD_HEIGHT",         "10000"));
int    cellSize   = int.Parse(Env("SPATIAL_CELL_SIZE",    "1500"));
string spawnsPath = Env("NPC_SPAWNS_PATH",                "/app/config/spawns.json");

// ── Wiring ────────────────────────────────────────────────────────────────────
var jwt      = new JwtValidator(publicKeyPath: keyPath);
var bridge   = new DjangoBridge(baseUrl: djangoUrl, webhookSecret: hookSecret);
var grid     = new SpatialGrid(worldWidth: worldW, worldHeight: worldH, cellSize: cellSize);
var npcs     = new NpcManager(grid);
var simLoop  = new SimulationLoop(grid: grid, bridge: bridge, npcs: npcs);
var listener = new UdpSocketListener(port: udpPort, simLoop: simLoop, jwt: jwt, bridge: bridge);

// ── Spawn NPCs from config file (falls back to built-in defaults) ─────────────
foreach (var def in SpawnLoader.Load(spawnsPath))
    npcs.Spawn(def.Type, x: def.X, y: def.Y, zone: def.Zone);

Console.WriteLine($"[Ravenna] Headless server  UDP={udpPort}  Django={djangoUrl}");
Console.WriteLine($"[Ravenna] World {worldW}×{worldH} cm  CellSize={cellSize} cm");

await Task.WhenAll(
    listener.RunAsync(cts.Token),
    simLoop.RunAsync(cts.Token),
    HealthServer.RunAsync(healthPort, cts.Token)
);

Console.WriteLine("[Ravenna] Shutdown complete.");

static string Env(string key, string fallback) =>
    Environment.GetEnvironmentVariable(key) ?? fallback;
