namespace RavennaServer.Simulation;

/// <summary>
/// Fixed-size 2D spatial grid for interest management.
/// Each cell covers <paramref name="cellSize"/> × <paramref name="cellSize"/> world units.
/// Zero-allocation reads: uses pre-allocated per-cell entity lists.
/// </summary>
internal sealed class SpatialGrid
{
    private readonly int _cellSize;
    private readonly int _cols;
    private readonly int _rows;

    // Per-cell entity sets (entity = ConvId of the PlayerSession)
    private readonly HashSet<uint>[] _cells;

    // Reverse map: entity → cell index (for O(1) moves)
    private readonly Dictionary<uint, int> _entityCell = new(512);

    // Scratch buffer for neighbor queries — reused per call, single-threaded
    private readonly List<uint> _neighborScratch = new(64);

    public SpatialGrid(int worldWidth, int worldHeight, int cellSize)
    {
        _cellSize = cellSize;
        _cols     = (worldWidth  + cellSize - 1) / cellSize;
        _rows     = (worldHeight + cellSize - 1) / cellSize;
        _cells    = new HashSet<uint>[_cols * _rows];
        for (int i = 0; i < _cells.Length; i++)
            _cells[i] = new HashSet<uint>(8);
    }

    // ── Mutation ──────────────────────────────────────────────────────────────

    /// <summary>Register or move entity to the cell that contains (x, y).</summary>
    public void Upsert(uint entityId, int x, int y)
    {
        int newCell = CellIndex(x, y);

        if (_entityCell.TryGetValue(entityId, out int oldCell))
        {
            if (oldCell == newCell) return;  // same cell — nothing to do
            _cells[oldCell].Remove(entityId);
        }

        _cells[newCell].Add(entityId);
        _entityCell[entityId] = newCell;
    }

    /// <summary>Remove entity from the grid entirely.</summary>
    public void Remove(uint entityId)
    {
        if (_entityCell.TryGetValue(entityId, out int cell))
        { _cells[cell].Remove(entityId); _entityCell.Remove(entityId); }
    }

    /// <summary>
    /// Return all entities in the 3×3 neighbourhood around (x, y).
    /// Result is written into <paramref name="result"/>; caller must clear it.
    /// </summary>
    public void GetNeighbours(int x, int y, List<uint> result)
    {
        int cx = x / _cellSize;
        int cy = y / _cellSize;

        for (int dy = -1; dy <= 1; dy++)
        for (int dx = -1; dx <= 1; dx++)
        {
            int nx = cx + dx, ny = cy + dy;
            if (nx < 0 || nx >= _cols || ny < 0 || ny >= _rows) continue;
            foreach (uint id in _cells[ny * _cols + nx])
                result.Add(id);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private int CellIndex(int x, int y)
    {
        int cx = Math.Clamp(x / _cellSize, 0, _cols - 1);
        int cy = Math.Clamp(y / _cellSize, 0, _rows - 1);
        return cy * _cols + cx;
    }
}
