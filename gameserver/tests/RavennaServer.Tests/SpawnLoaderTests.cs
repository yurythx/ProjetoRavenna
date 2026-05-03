using RavennaServer;
using Xunit;

namespace RavennaServer.Tests;

public class SpawnLoaderTests : IDisposable
{
    private readonly List<string> _tempFiles = [];

    public void Dispose()
    {
        foreach (var f in _tempFiles)
            if (File.Exists(f)) File.Delete(f);
    }

    private string WriteTempJson(string content)
    {
        string path = Path.GetTempFileName();
        File.WriteAllText(path, content);
        _tempFiles.Add(path);
        return path;
    }

    // ── Defaults ──────────────────────────────────────────────────────────────

    [Fact]
    public void Defaults_Returns6Entries()
    {
        Assert.Equal(6, SpawnLoader.Defaults().Count);
    }

    [Fact]
    public void Defaults_Contains3Wolves()
    {
        int wolves = SpawnLoader.Defaults().Count(d => d.Type == "wolf");
        Assert.Equal(3, wolves);
    }

    [Fact]
    public void Defaults_Contains3Bandits()
    {
        int bandits = SpawnLoader.Defaults().Count(d => d.Type == "bandit");
        Assert.Equal(3, bandits);
    }

    // ── Load from valid file ──────────────────────────────────────────────────

    [Fact]
    public void Load_ValidJson_ParsesCorrectly()
    {
        string path = WriteTempJson("""
            [
              {"type":"wolf","x":100,"y":200},
              {"type":"bandit","x":500,"y":600}
            ]
            """);

        var defs = SpawnLoader.Load(path);

        Assert.Equal(2, defs.Count);
        Assert.Equal("wolf",   defs[0].Type);
        Assert.Equal(100,      defs[0].X);
        Assert.Equal(200,      defs[0].Y);
        Assert.Equal("bandit", defs[1].Type);
    }

    [Fact]
    public void Load_ValidJson_CaseInsensitiveKeys()
    {
        string path = WriteTempJson("""
            [{"Type":"wolf","X":300,"Y":400}]
            """);

        var defs = SpawnLoader.Load(path);

        Assert.Single(defs);
        Assert.Equal("wolf", defs[0].Type);
        Assert.Equal(300,    defs[0].X);
    }

    // ── Fallback scenarios ────────────────────────────────────────────────────

    [Fact]
    public void Load_FileNotFound_FallsBackToDefaults()
    {
        var defs = SpawnLoader.Load("/nonexistent/path/spawns.json");
        Assert.Equal(SpawnLoader.Defaults().Count, defs.Count);
    }

    [Fact]
    public void Load_InvalidJson_FallsBackToDefaults()
    {
        string path = WriteTempJson("not valid json {{{{");
        var defs = SpawnLoader.Load(path);
        Assert.Equal(SpawnLoader.Defaults().Count, defs.Count);
    }

    [Fact]
    public void Load_EmptyArray_FallsBackToDefaults()
    {
        string path = WriteTempJson("[]");
        var defs = SpawnLoader.Load(path);
        Assert.Equal(SpawnLoader.Defaults().Count, defs.Count);
    }

    [Fact]
    public void Load_EmptyFile_FallsBackToDefaults()
    {
        string path = WriteTempJson("");
        var defs = SpawnLoader.Load(path);
        Assert.Equal(SpawnLoader.Defaults().Count, defs.Count);
    }

    [Fact]
    public void Load_ValidJson_OverridesDefaults()
    {
        string path = WriteTempJson("""[{"type":"dragon","x":9000,"y":9000}]""");
        var defs = SpawnLoader.Load(path);
        Assert.Single(defs);
        Assert.Equal("dragon", defs[0].Type);
    }
}
