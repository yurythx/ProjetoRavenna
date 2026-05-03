namespace RavennaServer.Simulation;

internal enum Faction
{
    None      = 0,
    Vanguarda = 1,
    Legiao    = 2,
}

internal static class FactionHelper
{
    /// <summary>Two entities are enemies when they belong to different non-None factions.</summary>
    public static bool AreEnemies(Faction a, Faction b) =>
        a != Faction.None && b != Faction.None && a != b;
}
