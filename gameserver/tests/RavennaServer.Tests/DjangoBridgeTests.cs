using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using RavennaServer.Bridge;
using Xunit;

namespace RavennaServer.Tests;

public class DjangoBridgeTests
{
    private const string Secret  = "test-secret";
    private const string BaseUrl = "http://localhost:8001";

    // ── Fake HTTP handler ─────────────────────────────────────────────────────

    /// <summary>Records every request; responds with a configurable status code.</summary>
    private sealed class FakeHandler : HttpMessageHandler
    {
        public List<HttpRequestMessage> Requests { get; } = [];
        public HttpStatusCode ResponseStatus { get; set; } = HttpStatusCode.OK;
        public string ResponseBody { get; set; } = "{}";

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage req, CancellationToken ct)
        {
            Requests.Add(req);
            var resp = new HttpResponseMessage(ResponseStatus)
            {
                Content = new StringContent(ResponseBody, Encoding.UTF8, "application/json"),
            };
            return Task.FromResult(resp);
        }
    }

    private static DjangoBridge MakeBridge(FakeHandler handler) =>
        new(BaseUrl, Secret, new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(5) });

    private static string ComputeExpectedHmac(string body)
    {
        byte[] key  = Encoding.UTF8.GetBytes(Secret);
        byte[] data = Encoding.UTF8.GetBytes(body);
        return Convert.ToHexString(HMACSHA256.HashData(key, data)).ToLowerInvariant();
    }

    // ── SendEventAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task SendEventAsync_Success_SendsOneRequest()
    {
        var handler = new FakeHandler();
        var bridge  = MakeBridge(handler);

        await bridge.SendEventAsync(new GameEvent
        {
            EventType = "xp_gained",
            PlayerId  = "user-1",
            Data      = new Dictionary<string, object> { ["amount"] = 100 },
        });

        Assert.Single(handler.Requests);
    }

    [Fact]
    public async Task SendEventAsync_PostsToEventsEndpoint()
    {
        var handler = new FakeHandler();
        var bridge  = MakeBridge(handler);

        await bridge.SendEventAsync(new GameEvent
        {
            EventType = "player_connected",
            PlayerId  = "user-1",
        });

        Assert.Equal(HttpMethod.Post, handler.Requests[0].Method);
        Assert.Contains("/api/v1/game-logic/events/", handler.Requests[0].RequestUri!.ToString());
    }

    [Fact]
    public async Task SendEventAsync_IncludesHmacSignatureHeader()
    {
        var handler = new FakeHandler();
        var bridge  = MakeBridge(handler);

        await bridge.SendEventAsync(new GameEvent
        {
            EventType = "player_disconnected",
            PlayerId  = "user-abc",
        });

        var req  = handler.Requests[0];
        Assert.True(req.Headers.TryGetValues("X-Webhook-Secret", out var values));
        string sig = values.First();
        Assert.False(string.IsNullOrEmpty(sig));
    }

    [Fact]
    public async Task SendEventAsync_HmacMatchesBodyContent()
    {
        var handler = new FakeHandler();
        var bridge  = MakeBridge(handler);

        await bridge.SendEventAsync(new GameEvent
        {
            EventType = "xp_gained",
            PlayerId  = "user-1",
            Data      = new Dictionary<string, object> { ["amount"] = 50 },
        });

        var req     = handler.Requests[0];
        string body = await req.Content!.ReadAsStringAsync();
        string expectedSig = ComputeExpectedHmac(body);

        req.Headers.TryGetValues("X-Webhook-Secret", out var vals);
        Assert.Equal(expectedSig, vals!.First());
    }

    [Fact]
    public async Task SendEventAsync_ServerError_RetriesUpTo3Times()
    {
        var handler = new FakeHandler { ResponseStatus = HttpStatusCode.InternalServerError };
        var bridge  = MakeBridge(handler);

        await bridge.SendEventAsync(new GameEvent
        {
            EventType = "xp_gained",
            PlayerId  = "user-1",
        });

        Assert.Equal(3, handler.Requests.Count);
    }

    [Fact]
    public async Task SendEventAsync_FirstAttemptSucceeds_NoRetry()
    {
        var handler = new FakeHandler { ResponseStatus = HttpStatusCode.OK };
        var bridge  = MakeBridge(handler);

        await bridge.SendEventAsync(new GameEvent
        {
            EventType = "player_connected",
            PlayerId  = "user-1",
        });

        Assert.Single(handler.Requests);
    }

    [Fact]
    public async Task SendEventAsync_BodyContainsEventTypeAndPlayerId()
    {
        var handler = new FakeHandler();
        var bridge  = MakeBridge(handler);

        await bridge.SendEventAsync(new GameEvent
        {
            EventType = "player_killed",
            PlayerId  = "killer-uuid",
            Data      = new Dictionary<string, object> { ["victim_user_id"] = "victim-uuid" },
        });

        string body = await handler.Requests[0].Content!.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;

        Assert.Equal("player_killed", root.GetProperty("event_type").GetString());
        Assert.Equal("killer-uuid",   root.GetProperty("player_id").GetString());
    }

    // ── FetchPlayerStateAsync ─────────────────────────────────────────────────

    [Fact]
    public async Task FetchPlayerStateAsync_Success_ReturnsState()
    {
        var handler = new FakeHandler
        {
            ResponseBody = """{"hp":80,"max_hp":100,"pos_x":1500,"pos_y":2500}""",
        };
        var bridge = MakeBridge(handler);

        var state = await bridge.FetchPlayerStateAsync("user-1");

        Assert.NotNull(state);
        Assert.Equal(80,   state.Hp);
        Assert.Equal(100,  state.MaxHp);
        Assert.Equal(1500, state.PosX);
        Assert.Equal(2500, state.PosY);
    }

    [Fact]
    public async Task FetchPlayerStateAsync_NotFound_ReturnsNull()
    {
        var handler = new FakeHandler { ResponseStatus = HttpStatusCode.NotFound };
        var bridge  = MakeBridge(handler);

        var state = await bridge.FetchPlayerStateAsync("unknown-user");

        Assert.Null(state);
    }

    [Fact]
    public async Task FetchPlayerStateAsync_SendsGetRequest()
    {
        var handler = new FakeHandler
        {
            ResponseBody = """{"hp":100,"max_hp":100,"pos_x":0,"pos_y":0}""",
        };
        var bridge = MakeBridge(handler);

        await bridge.FetchPlayerStateAsync("user-42");

        Assert.Equal(HttpMethod.Get, handler.Requests[0].Method);
    }

    [Fact]
    public async Task FetchPlayerStateAsync_UrlContainsUserId()
    {
        var handler = new FakeHandler
        {
            ResponseBody = """{"hp":100,"max_hp":100,"pos_x":0,"pos_y":0}""",
        };
        var bridge = MakeBridge(handler);

        await bridge.FetchPlayerStateAsync("user-xyz");

        Assert.Contains("user-xyz", handler.Requests[0].RequestUri!.ToString());
    }

    [Fact]
    public async Task FetchPlayerStateAsync_HmacOfUserIdInHeader()
    {
        var handler = new FakeHandler
        {
            ResponseBody = """{"hp":100,"max_hp":100,"pos_x":0,"pos_y":0}""",
        };
        var bridge  = MakeBridge(handler);
        string userId = "user-secure";

        await bridge.FetchPlayerStateAsync(userId);

        handler.Requests[0].Headers.TryGetValues("X-Webhook-Secret", out var vals);
        string actual   = vals!.First();
        string expected = ComputeExpectedHmac(userId);
        Assert.Equal(expected, actual);
    }

    [Fact]
    public async Task FetchPlayerStateAsync_NetworkError_ReturnsNull()
    {
        var bridge = new DjangoBridge(
            "http://127.0.0.1:1",   // unreachable port
            Secret,
            new HttpClient { Timeout = TimeSpan.FromMilliseconds(100) });

        var state = await bridge.FetchPlayerStateAsync("user-1");

        Assert.Null(state);
    }
}
