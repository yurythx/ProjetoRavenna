using System.Net;
using System.Text.Json;
using RavennaServer.Bridge;
using RavennaServer.Simulation;
using Xunit;

namespace RavennaServer.Tests;

public class SimulationLoopTests
{
    // ── Helpers ───────────────────────────────────────────────────────────────

    private sealed class FakeHandler : HttpMessageHandler
    {
        public readonly List<string> Bodies = [];
        private readonly SemaphoreSlim _signal = new(0);

        public Task WaitForRequestAsync(TimeSpan timeout) =>
            _signal.WaitAsync(timeout);

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage req, CancellationToken ct)
        {
            var body = req.Content?.ReadAsStringAsync().GetAwaiter().GetResult() ?? "";
            Bodies.Add(body);
            _signal.Release();
            return Task.FromResult(new HttpResponseMessage(System.Net.HttpStatusCode.OK));
        }
    }

    private static (SimulationLoop sim, FakeHandler handler) MakeSim()
    {
        var handler = new FakeHandler();
        var bridge  = new DjangoBridge("http://localhost:8001", "secret",
            new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(5) });
        var grid    = new SpatialGrid(10_000, 10_000, 5_000);
        var npcs    = new NpcManager(grid);
        var sim     = new SimulationLoop(grid, bridge, npcs);
        return (sim, handler);
    }

    private static PlayerSession MakeSession(uint convId = 1u,
        string userId = "user-1", int x = 100, int y = 200, int hp = 100)
    {
        var ep = new IPEndPoint(IPAddress.Loopback, 9000);
        return new PlayerSession(convId, userId, "hwid-test", ep)
        {
            Position  = new EntityPosition { X = x, Y = y },
            CurrentHp = hp,
            MaxHp     = 100,
        };
    }

    // ── OnPlayerConnected ─────────────────────────────────────────────────────

    [Fact]
    public async Task OnPlayerConnected_SendsPlayerConnectedWebhook()
    {
        var (sim, handler) = MakeSim();
        var session = MakeSession(userId: "user-connect-1");

        sim.OnPlayerConnected(session);

        bool received = await handler.WaitForRequestAsync(TimeSpan.FromSeconds(2));
        Assert.True(received, "Expected player_connected webhook within 2 s");

        var body = JsonDocument.Parse(handler.Bodies[0]).RootElement;
        Assert.Equal("player_connected", body.GetProperty("event_type").GetString());
        Assert.Equal("user-connect-1",   body.GetProperty("player_id").GetString());
    }

    [Fact]
    public async Task OnPlayerConnected_WebhookIncludesConvIdAndHwid()
    {
        var (sim, handler) = MakeSim();
        var session = MakeSession(convId: 42u, userId: "user-1");

        sim.OnPlayerConnected(session);
        await handler.WaitForRequestAsync(TimeSpan.FromSeconds(2));

        var data = JsonDocument.Parse(handler.Bodies[0])
            .RootElement.GetProperty("data");

        Assert.True(data.TryGetProperty("conv_id", out _));
        Assert.True(data.TryGetProperty("hwid",    out _));
    }

    // ── OnPlayerDisconnected ──────────────────────────────────────────────────

    [Fact]
    public async Task OnPlayerDisconnected_SendsPlayerDisconnectedWebhook()
    {
        var (sim, handler) = MakeSim();
        var session = MakeSession(convId: 1u, userId: "user-dc-1");

        sim.OnPlayerConnected(session);
        await handler.WaitForRequestAsync(TimeSpan.FromSeconds(2));
        handler.Bodies.Clear();

        sim.OnPlayerDisconnected(session.ConvId);

        bool received = await handler.WaitForRequestAsync(TimeSpan.FromSeconds(2));
        Assert.True(received, "Expected player_disconnected webhook within 2 s");

        var body = JsonDocument.Parse(handler.Bodies[0]).RootElement;
        Assert.Equal("player_disconnected", body.GetProperty("event_type").GetString());
        Assert.Equal("user-dc-1",           body.GetProperty("player_id").GetString());
    }

    [Fact]
    public async Task OnPlayerDisconnected_WebhookContainsPosAndHp()
    {
        var (sim, handler) = MakeSim();
        var session = MakeSession(convId: 2u, userId: "user-pos", x: 1234, y: 5678, hp: 73);

        sim.OnPlayerConnected(session);
        await handler.WaitForRequestAsync(TimeSpan.FromSeconds(2));
        handler.Bodies.Clear();

        sim.OnPlayerDisconnected(session.ConvId);
        await handler.WaitForRequestAsync(TimeSpan.FromSeconds(2));

        var data = JsonDocument.Parse(handler.Bodies[0])
            .RootElement.GetProperty("data");

        Assert.True(data.TryGetProperty("pos_x", out var posX));
        Assert.True(data.TryGetProperty("pos_y", out var posY));
        Assert.True(data.TryGetProperty("hp",    out var hp));

        Assert.Equal(1234, posX.GetInt32());
        Assert.Equal(5678, posY.GetInt32());
        Assert.Equal(73,   hp.GetInt32());
    }

    [Fact]
    public void OnPlayerDisconnected_UnknownConvId_DoesNotThrow()
    {
        var (sim, _) = MakeSim();
        var ex = Record.Exception(() => sim.OnPlayerDisconnected(9999u));
        Assert.Null(ex);
    }

    [Fact]
    public async Task OnPlayerConnected_ThenDisconnected_TwoWebhooksFired()
    {
        var (sim, handler) = MakeSim();
        var session = MakeSession(convId: 10u, userId: "user-flow");

        sim.OnPlayerConnected(session);
        await handler.WaitForRequestAsync(TimeSpan.FromSeconds(2));

        sim.OnPlayerDisconnected(session.ConvId);
        await handler.WaitForRequestAsync(TimeSpan.FromSeconds(2));

        Assert.Equal(2, handler.Bodies.Count);
    }
}
