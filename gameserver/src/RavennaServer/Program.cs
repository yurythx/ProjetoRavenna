using RavennaServer.Bridge;
using RavennaServer.Network;
using RavennaServer.Simulation;

var cts = new CancellationTokenSource();
Console.CancelKeyPress += (_, e) => { e.Cancel = true; cts.Cancel(); };

// ── Config from environment ───────────────────────────────────────────────────
int    udpPort    = int.Parse(Env("UDP_PORT",             "7777"));
string djangoUrl  = Env("DJANGO_URL",                     "http://localhost:8001");
string keyPath    = Env("JWT_PUBLIC_KEY_PATH",            "/app/keys/public.pem");
string hookSecret = Env("DJANGO_WEBHOOK_SECRET",          "changeme");
int    worldW     = int.Parse(Env("WORLD_WIDTH",          "10000"));
int    worldH     = int.Parse(Env("WORLD_HEIGHT",         "10000"));
int    cellSize   = int.Parse(Env("SPATIAL_CELL_SIZE",    "50"));

// ── Wiring ────────────────────────────────────────────────────────────────────
var jwt      = new JwtValidator(publicKeyPath: keyPath);
var bridge   = new DjangoBridge(baseUrl: djangoUrl, webhookSecret: hookSecret);
var grid     = new SpatialGrid(worldWidth: worldW, worldHeight: worldH, cellSize: cellSize);
var simLoop  = new SimulationLoop(grid: grid, bridge: bridge);
var listener = new UdpSocketListener(port: udpPort, simLoop: simLoop, jwt: jwt);

Console.WriteLine($"[Ravenna] Headless server  UDP={udpPort}  Django={djangoUrl}");

await Task.WhenAll(
    listener.RunAsync(cts.Token),
    simLoop.RunAsync(cts.Token)
);

Console.WriteLine("[Ravenna] Shutdown complete.");

static string Env(string key, string fallback) =>
    Environment.GetEnvironmentVariable(key) ?? fallback;
