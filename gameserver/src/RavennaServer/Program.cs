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
