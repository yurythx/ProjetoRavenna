using System.Text.Json;

namespace RavennaServer;

/// <summary>
/// Describes a single NPC spawn entry loaded from spawns.json.
/// Zone defaults to "plains" when omitted.
/// </summary>
internal sealed record NpcSpawnDef(string Type, int X, int Y, string Zone = "plains");

internal static class SpawnLoader
{
    private static readonly JsonSerializerOptions _jsonOpts =
        new() { PropertyNameCaseInsensitive = true };

    public static List<NpcSpawnDef> Load(string path)
    {
        if (File.Exists(path))
        {
            try
            {
                var defs = JsonSerializer.Deserialize<List<NpcSpawnDef>>(
                    File.ReadAllText(path), _jsonOpts);

                if (defs is { Count: > 0 })
                {
                    Console.WriteLine($"[Ravenna] Loaded {defs.Count} NPC spawns from {path}");
                    return defs;
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(
                    $"[Ravenna] Failed to parse {path}: {ex.Message} — using defaults");
            }
        }
        else
        {
            Console.WriteLine($"[Ravenna] {path} not found — using built-in NPC defaults");
        }

        return Defaults();
    }

    public static List<NpcSpawnDef> Defaults() =>
    [
        new("wolf",   2000, 3000, "plains"),
        new("wolf",   2300, 2800, "plains"),
        new("wolf",   1800, 3200, "plains"),
        new("bandit", 7000, 6500, "forest"),
        new("bandit", 7300, 6700, "forest"),
        new("bandit", 6800, 6300, "forest"),
    ];
}
