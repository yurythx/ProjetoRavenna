using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace RavennaServer.Bridge;

internal sealed record GameEvent
{
    public required string                      EventType { get; init; }
    public required string                      PlayerId  { get; init; }
    public          Dictionary<string, object>? Data      { get; init; }
}

/// <summary>
/// Sends persistence events to Django via signed HTTP webhooks.
/// Fire-and-forget: the simulation loop never awaits these directly.
/// Uses a shared HttpClient with a 5 s timeout and 3 retries.
/// </summary>
internal sealed class DjangoBridge : IDisposable
{
    private readonly HttpClient _http;
    private readonly string     _webhookSecret;
    private readonly string     _eventsUrl;

    public DjangoBridge(string baseUrl, string webhookSecret)
    {
        _webhookSecret = webhookSecret;
        _eventsUrl     = baseUrl.TrimEnd('/') + "/api/v1/game-logic/events/";

        _http = new HttpClient
        {
            Timeout = TimeSpan.FromSeconds(5),
        };
    }

    /// <summary>
    /// Post a game event to Django. Failures are logged but never thrown —
    /// the simulation must not block on persistence.
    /// </summary>
    public async Task SendEventAsync(GameEvent evt)
    {
        string body = JsonSerializer.Serialize(new
        {
            event_type = evt.EventType,
            player_id  = evt.PlayerId,
            data       = evt.Data ?? new Dictionary<string, object>(),
        });

        string signature = ComputeHmac(body);

        for (int attempt = 0; attempt < 3; attempt++)
        {
            try
            {
                using var req = new HttpRequestMessage(HttpMethod.Post, _eventsUrl);
                req.Content = new StringContent(body, Encoding.UTF8, "application/json");
                req.Headers.Add("X-Webhook-Secret", signature);

                using var resp = await _http.SendAsync(req).ConfigureAwait(false);
                if (resp.IsSuccessStatusCode) return;

                Console.Error.WriteLine(
                    $"[Bridge] Event {evt.EventType} failed: HTTP {(int)resp.StatusCode}");
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[Bridge] Attempt {attempt + 1} error: {ex.Message}");
                if (attempt < 2) await Task.Delay(200 * (attempt + 1)).ConfigureAwait(false);
            }
        }
    }

    private string ComputeHmac(string body)
    {
        byte[] key   = Encoding.UTF8.GetBytes(_webhookSecret);
        byte[] bytes = Encoding.UTF8.GetBytes(body);
        byte[] hash  = HMACSHA256.HashData(key, bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    public void Dispose() => _http.Dispose();
}
