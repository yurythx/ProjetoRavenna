// =============================================================================
// SpawnLoader.cs — Carregamento de configuração de spawns de NPCs
// =============================================================================
//
// Lê o arquivo spawns.json definido por NPC_SPAWNS_PATH (env var) e retorna
// a lista de NPCs que devem ser spawnados no início do servidor.
// Se o arquivo não existir ou for inválido, usa os Defaults() embutidos.
//
// Formato do spawns.json:
//   [
//     { "type": "wolf",   "x": 2000, "y": 3000, "zone": "plains" },
//     { "type": "bandit", "x": 7000, "y": 6500, "zone": "forest" },
//     { "type": "elite_wolf", "x": 5000, "y": 5000, "zone": "ruins" }
//   ]
//
// Tipos de NPC válidos: "wolf", "bandit", "elite_wolf", "bandit_captain"
// Zonas válidas: "plains" (nível 1), "forest" (nível 5), "ruins" (nível 10)
// Coordenadas em centímetros (cm) no espaço do mundo (0..WORLD_WIDTH/HEIGHT)
//
// Para adicionar novos tipos de NPC:
//   1. Adicione o CombatProfile em CombatState.cs
//   2. Mapeie o nome em NpcManager.CombatProfileFor()
//   3. Adicione entradas de loot em LootTable.cs
//   4. Registre o UUID do item em Django (migration)
// =============================================================================
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
