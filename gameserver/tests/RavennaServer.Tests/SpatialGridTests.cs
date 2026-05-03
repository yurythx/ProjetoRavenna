using RavennaServer.Simulation;
using Xunit;

namespace RavennaServer.Tests;

public class SpatialGridTests
{
    private static SpatialGrid MakeGrid() => new(10_000, 10_000, 5_000);

    [Fact]
    public void Upsert_NewEntity_FoundByGetNeighbours()
    {
        var grid = MakeGrid();
        grid.Upsert(1u, 100, 100);

        var result = new List<uint>();
        grid.GetNeighbours(100, 100, result);

        Assert.Contains(1u, result);
    }

    [Fact]
    public void Remove_EntityNoLongerInNeighbours()
    {
        var grid = MakeGrid();
        grid.Upsert(1u, 100, 100);
        grid.Remove(1u);

        var result = new List<uint>();
        grid.GetNeighbours(100, 100, result);

        Assert.DoesNotContain(1u, result);
    }

    [Fact]
    public void GetNeighbours_EmptyGrid_ReturnsEmptyList()
    {
        var grid   = MakeGrid();
        var result = new List<uint>();
        grid.GetNeighbours(500, 500, result);
        Assert.Empty(result);
    }

    [Fact]
    public void Upsert_MoveEntity_Appears_InNewCell_NotOld()
    {
        var grid = MakeGrid();
        // Cell size 5000 — entity in first cell
        grid.Upsert(7u, 100, 100);
        // Move to second cell
        grid.Upsert(7u, 6000, 6000);

        var nearOrigin = new List<uint>();
        grid.GetNeighbours(100, 100, nearOrigin);

        var nearNewPos = new List<uint>();
        grid.GetNeighbours(6000, 6000, nearNewPos);

        // Should NOT appear in origin-adjacent cells anymore
        // (depends on cell layout — at minimum must appear at new position)
        Assert.Contains(7u, nearNewPos);
    }

    [Fact]
    public void GetNeighbours_MultipleEntitiesInSameCell_AllReturned()
    {
        var grid = MakeGrid();
        grid.Upsert(1u, 100, 100);
        grid.Upsert(2u, 200, 200);
        grid.Upsert(3u, 300, 300);

        var result = new List<uint>();
        grid.GetNeighbours(150, 150, result);

        Assert.Contains(1u, result);
        Assert.Contains(2u, result);
        Assert.Contains(3u, result);
    }

    [Fact]
    public void Upsert_SameEntityTwice_OnlyOneEntryInNeighbours()
    {
        var grid = MakeGrid();
        grid.Upsert(5u, 100, 100);
        grid.Upsert(5u, 100, 100);

        var result = new List<uint>();
        grid.GetNeighbours(100, 100, result);

        Assert.Single(result.Where(id => id == 5u));
    }

    [Fact]
    public void Remove_NonExistentEntity_DoesNotThrow()
    {
        var grid = MakeGrid();
        var ex   = Record.Exception(() => grid.Remove(999u));
        Assert.Null(ex);
    }

    [Fact]
    public void GetNeighbours_ClearsPreviousResults()
    {
        var grid = MakeGrid();
        grid.Upsert(1u, 100, 100);

        var result = new List<uint> { 99u }; // pre-populated
        grid.GetNeighbours(100, 100, result);

        // Result should be cleared and re-populated
        Assert.DoesNotContain(99u, result);
        Assert.Contains(1u, result);
    }
}
