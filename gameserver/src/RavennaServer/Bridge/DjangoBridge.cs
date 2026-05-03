using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace RavennaServer.Bridge;

internal sealed record GameEvent
{
    public required string                      EventType { get; init; }
    public required string                      PlayerId  { get; init; }
    public          Dictionary<string, object>? Data      { get; init; }
}

/// <summary>Equipment bonus totals returned by Django GameStateView.</summary>
internal sealed record EquipmentBonuses(
    int   PhysDamage,
    int   MagDamage,
    int   PhysDefense,
    int   MagDefense,
    int   Health,
    int   Mana,
    float AttackSpeed,
    int   Speed
);

/// <summary>Active skill loaded from Django (server_id bridges Django UUID to C# uint).</summary>
internal sealed record SkillState(int ServerId, int CurrentLevel, int? SlotIndex);

/// <summary>
/// Accumulated passive stat bonuses from class passive + racial passive.
/// Flat bonuses (Str/Agi/Int/Vit) are applied BEFORE derived-stat calculation.
/// Percentage bonuses (*Pct) are applied AFTER, as multipliers on derived stats.
/// </summary>
internal sealed record PassiveBonuses(
    int Str  = 0, int Agi  = 0, int Int  = 0, int Vit  = 0,
    int MaxHpPct       = 0, int MaxManaPct      = 0,
    int PhysDamagePct  = 0, int MagDamagePct    = 0,
    int PhysDefensePct = 0, int MagDefensePct   = 0,
    int MoveSpeedPct   = 0, int AttackRangePct  = 0
)
{
    public static readonly PassiveBonuses None = new();
}

/// <summary>Full player state returned by Django GameStateView on handshake.</summary>
internal sealed record PlayerState(
    int              Hp,
    int              MaxHp,
    int              Mana,
    int              MaxMana,
    int              PosX,
    int              PosY,
    int              Level,
    int              Strength,
    int              Agility,
    int              Intelligence,
    int              Vitality,
    string           Faction,
    string           CharacterClass,
    string           Race,
    EquipmentBonuses EquipmentBonuses,
    PassiveBonuses   PassiveBonuses,
    SkillState[]     Skills,
    string?          PartyId = null
);

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
    private readonly string     _baseUrl;

    public DjangoBridge(string baseUrl, string webhookSecret, HttpClient? httpClient = null)
    {
        _webhookSecret = webhookSecret;
        _baseUrl       = baseUrl.TrimEnd('/');
        _eventsUrl     = _baseUrl + "/api/v1/game-logic/events/";
        _http          = httpClient ?? new HttpClient { Timeout = TimeSpan.FromSeconds(5) };
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

    /// <summary>
    /// Fetches the full player state (stats, equipment bonuses, skills) for handshake.
    /// Blocks the caller for up to 300 ms; returns null on timeout or error.
    /// Safe to call on the receive thread (dedicated OS thread, not thread-pool).
    /// </summary>
    public async Task<PlayerState?> FetchPlayerStateAsync(string userId)
    {
        string signature = ComputeHmac(userId);
        string url       = $"{_baseUrl}/api/v1/game-logic/game-state/{userId}/";

        using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(300));
        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Get, url);
            req.Headers.Add("X-Webhook-Secret", signature);

            using var resp = await _http.SendAsync(req, cts.Token).ConfigureAwait(false);
            if (!resp.IsSuccessStatusCode) return null;

            var json = await resp.Content.ReadFromJsonAsync<PlayerStateDto>(
                cancellationToken: cts.Token).ConfigureAwait(false);
            if (json is null) return null;

            var bonuses = new EquipmentBonuses(
                json.equipment_bonuses?.phys_damage  ?? 0,
                json.equipment_bonuses?.mag_damage   ?? 0,
                json.equipment_bonuses?.phys_defense ?? 0,
                json.equipment_bonuses?.mag_defense  ?? 0,
                json.equipment_bonuses?.health       ?? 0,
                json.equipment_bonuses?.mana         ?? 0,
                json.equipment_bonuses?.attack_speed ?? 0f,
                json.equipment_bonuses?.speed        ?? 0
            );

            var pb = json.passive_bonuses;
            var passives = pb is null ? PassiveBonuses.None : new PassiveBonuses(
                Str:             pb.str,
                Agi:             pb.agi,
                Int:             pb.@int,
                Vit:             pb.vit,
                MaxHpPct:        pb.max_hp_pct,
                MaxManaPct:      pb.max_mana_pct,
                PhysDamagePct:   pb.phys_damage_pct,
                MagDamagePct:    pb.mag_damage_pct,
                PhysDefensePct:  pb.phys_defense_pct,
                MagDefensePct:   pb.mag_defense_pct,
                MoveSpeedPct:    pb.move_speed_pct,
                AttackRangePct:  pb.attack_range_pct
            );

            var skills = json.skills is null
                ? Array.Empty<SkillState>()
                : json.skills
                    .Where(s => s.server_id.HasValue)
                    .Select(s => new SkillState(s.server_id!.Value, s.current_level, s.slot_index))
                    .ToArray();

            return new PlayerState(
                json.hp,  json.max_hp,
                json.mana, json.max_mana,
                json.pos_x, json.pos_y,
                json.level,
                json.strength, json.agility, json.intelligence, json.vitality,
                json.faction         ?? "",
                json.character_class ?? "",
                json.race            ?? "",
                bonuses,
                passives,
                skills,
                PartyId: json.party_id
            );
        }
        catch
        {
            return null;
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

    // ── DTOs — match the JSON keys from Django GameStateView ─────────────────

    private sealed class PlayerStateDto
    {
        public int    hp            { get; set; }
        public int    max_hp        { get; set; }
        public int    mana          { get; set; }
        public int    max_mana      { get; set; }
        public int    pos_x         { get; set; }
        public int    pos_y         { get; set; }
        public int    level         { get; set; } = 1;
        public int    strength      { get; set; } = 10;
        public int    agility       { get; set; } = 10;
        public int    intelligence  { get; set; } = 10;
        public int    vitality      { get; set; } = 10;
        public string? faction         { get; set; }
        public string? character_class { get; set; }
        public string? race            { get; set; }
        public EquipmentBonusesDto?  equipment_bonuses { get; set; }
        public PassiveBonusesDto?    passive_bonuses   { get; set; }
        public SkillStateDto[]?      skills            { get; set; }
        public string?               party_id          { get; set; }
    }

    private sealed class EquipmentBonusesDto
    {
        public int   phys_damage  { get; set; }
        public int   mag_damage   { get; set; }
        public int   phys_defense { get; set; }
        public int   mag_defense  { get; set; }
        public int   health       { get; set; }
        public int   mana         { get; set; }
        public float attack_speed { get; set; }
        public int   speed        { get; set; }
    }

    private sealed class PassiveBonusesDto
    {
        public int str             { get; set; }
        public int agi             { get; set; }
        public int @int            { get; set; }  // 'int' is a C# keyword — use verbatim
        public int vit             { get; set; }
        public int max_hp_pct      { get; set; }
        public int max_mana_pct    { get; set; }
        public int phys_damage_pct { get; set; }
        public int mag_damage_pct  { get; set; }
        public int phys_defense_pct{ get; set; }
        public int mag_defense_pct { get; set; }
        public int move_speed_pct  { get; set; }
        public int attack_range_pct{ get; set; }
    }

    private sealed class SkillStateDto
    {
        public int?  server_id     { get; set; }
        public int   current_level { get; set; } = 1;
        public int?  slot_index    { get; set; }
    }
}
