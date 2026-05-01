using System.Buffers;
using System.Collections.Concurrent;
using System.Diagnostics;
using Google.Protobuf;
using RavennaServer.Bridge;
using RavennaServer.Proto;

namespace RavennaServer.Simulation;

/// <summary>
/// 30 Hz fixed-timestep simulation loop (33.33 ms per tick).
/// Responsibilities:
///   1. Drain per-player KCP receive channels
///   2. Process game messages (move, action)
///   3. Run interest-management and broadcast WorldSnapshots
///   4. Evict stale sessions (no heartbeat for 30 s)
/// Zero-alloc policy: no LINQ, no new() in the tick body.
/// </summary>
internal sealed class SimulationLoop
{
    private const int    TICK_HZ         = 30;
    private const long   TICK_US         = 1_000_000L / TICK_HZ;      // 33 333 µs
    private const long   HEARTBEAT_LIMIT = 30_000;                     // ms
    private const int    RECV_BUF_SIZE   = 4096;

    private readonly SpatialGrid   _grid;
    private readonly DjangoBridge  _bridge;

    // All active sessions — written by network thread via OnPlayerConnected/Disconnected
    private readonly ConcurrentDictionary<uint, PlayerSession> _sessions = new();

    // Pre-allocated scratch collections (single-threaded simulation — safe to reuse)
    private readonly List<uint>          _neighbourScratch  = new(64);
    private readonly List<EntityState>   _snapshotScratch   = new(64);
    private readonly byte[]              _recvBuf           = new byte[RECV_BUF_SIZE];
    private          uint                _tick;

    public SimulationLoop(SpatialGrid grid, DjangoBridge bridge)
    {
        _grid   = grid;
        _bridge = bridge;
    }

    // ── Called by UdpSocketListener on handshake success ─────────────────────
    public void OnPlayerConnected(PlayerSession session)
    {
        try
        {
            _sessions[session.ConvId] = session;
            Console.WriteLine($"[Sim] Connected  user={session.UserId}  conv={session.ConvId}");

            // Notify Django of the connection
            Console.WriteLine($"[Sim] Sending player_connected for {session.UserId}");
            _ = _bridge.SendEventAsync(new GameEvent
            {
                EventType = "player_connected",
                PlayerId  = session.UserId,
                Data      = new Dictionary<string, object>
                {
                    ["conv_id"]   = session.ConvId,
                    ["hwid"]      = session.Hwid,
                    ["ip_address"] = session.RemoteEndPoint.Address.ToString()
                }
            });
            Console.Out.Flush();
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[Sim] Error in OnPlayerConnected: {ex.Message}");
            Console.Error.Flush();
        }
    }

    public void OnPlayerDisconnected(uint convId)
    {
        if (_sessions.TryRemove(convId, out var s))
        {
            _grid.Remove(convId);
            Console.WriteLine($"[Sim] Disconnected  user={s.UserId}  conv={convId}");
        }
    }

    // ── Main loop ─────────────────────────────────────────────────────────────
    public Task RunAsync(CancellationToken ct) =>
        Task.Factory.StartNew(() => Loop(ct),
            ct, TaskCreationOptions.LongRunning, TaskScheduler.Default);

    private void Loop(CancellationToken ct)
    {
        var sw          = Stopwatch.StartNew();
        long nextTickUs = GetMicroseconds();

        while (!ct.IsCancellationRequested)
        {
            long now = GetMicroseconds();
            if (now < nextTickUs)
            {
                // Busy-wait for remaining sub-millisecond time; yield for longer waits
                long waitMs = (nextTickUs - now) / 1_000;
                if (waitMs > 1) Thread.Sleep((int)(waitMs - 1));
                continue;
            }

            nextTickUs += TICK_US;
            _tick++;

            uint currentMs = (uint)(sw.ElapsedMilliseconds);
            Tick(currentMs);
        }
    }

    // ── Single simulation tick ────────────────────────────────────────────────
    private void Tick(uint currentMs)
    {
        long nowMs = Environment.TickCount64;

        foreach (var (convId, session) in _sessions)
        {
            // Drive KCP clock
            session.Kcp?.Update(currentMs);

            // Drain receive channel — process all queued packets this tick
            while (session.ReceiveChannel.Reader.TryRead(out var item))
            {
                try
                {
                    bool valid = session.Kcp?.Input(item.buf.AsSpan(0, item.len)) ?? false;
                    if (valid)
                        while (true)
                        {
                            int n = session.Kcp!.Recv(_recvBuf.AsSpan());
                            if (n <= 0) break;
                            ProcessMessage(session, _recvBuf.AsSpan(0, n), currentMs);
                        }
                }
                finally { ArrayPool<byte>.Shared.Return(item.buf); }
            }

            // Evict stale sessions
            if (nowMs - session.LastHeartbeatMs > HEARTBEAT_LIMIT)
            {
                KickPlayer(session, "timeout");
                continue;
            }

            // Update spatial grid with current position
            _grid.Upsert(convId, session.Position.X, session.Position.Y);
        }

        // Send WorldSnapshot to every player (interest-managed)
        if (_tick % 1 == 0)  // every tick at 30 Hz
            BroadcastSnapshots();
    }

    // ── Message dispatch ──────────────────────────────────────────────────────

    private void ProcessMessage(PlayerSession session, ReadOnlySpan<byte> data, uint currentMs)
    {
        if (data.IsEmpty) return;
        byte msgType = data[0];

        switch (msgType)
        {
            case 1:  // C2S_Move
                HandleMove(session, data[1..]);
                break;
            case 2:  // C2S_Action
                HandleAction(session, data[1..]);
                break;
            case 0xFF: // ping / heartbeat
                session.LastHeartbeatMs = Environment.TickCount64;
                break;
        }
    }

    private void HandleMove(PlayerSession session, ReadOnlySpan<byte> payload)
    {
        C2S_Move move;
        try { move = C2S_Move.Parser.ParseFrom(payload.ToArray()); }
        catch { return; }

        session.Position.X     = move.X;
        session.Position.Y     = move.Y;
        session.Flags          = (session.Flags & ~1u) | 1u;  // set moving flag
        session.LastHeartbeatMs = Environment.TickCount64;
    }

    private void HandleAction(PlayerSession session, ReadOnlySpan<byte> payload)
    {
        C2S_Action action;
        try { action = C2S_Action.Parser.ParseFrom(payload.ToArray()); }
        catch { return; }

        // Fire-and-forget: notify Django of the action (XP, item drop, etc.)
        _ = _bridge.SendEventAsync(new GameEvent
        {
            EventType = "player_action",
            PlayerId  = session.UserId,
            Data      = new Dictionary<string, object>
            {
                ["action_id"] = action.ActionId,
                ["target_id"] = action.TargetId,
            },
        });
    }

    // ── Snapshot broadcast ───────────────────────────────────────────────────

    private void BroadcastSnapshots()
    {
        foreach (var (convId, session) in _sessions)
        {
            _neighbourScratch.Clear();
            _snapshotScratch.Clear();

            _grid.GetNeighbours(session.Position.X, session.Position.Y, _neighbourScratch);

            foreach (uint neighbourId in _neighbourScratch)
            {
                if (!_sessions.TryGetValue(neighbourId, out var n)) continue;
                _snapshotScratch.Add(new EntityState
                {
                    EntityId = neighbourId,
                    X        = n.Position.X,
                    Y        = n.Position.Y,
                    Flags    = n.Flags,
                });
            }

            var snapshot = new S2C_WorldSnapshot { ServerTick = _tick };
            snapshot.Entities.AddRange(_snapshotScratch);

            byte[] payload = snapshot.ToByteArray();
            byte[] packet  = ArrayPool<byte>.Shared.Rent(1 + payload.Length);
            packet[0] = 0x10;  // message type: WorldSnapshot
            payload.CopyTo(packet, 1);
            session.Kcp?.Send(packet.AsSpan(0, 1 + payload.Length));
            ArrayPool<byte>.Shared.Return(packet);
        }
    }

    // ── Kick ─────────────────────────────────────────────────────────────────

    private void KickPlayer(PlayerSession session, string reason)
    {
        var evt = new S2C_Event { EventType = "kicked", Payload = Google.Protobuf.ByteString.CopyFromUtf8(reason) };
        byte[] payload = evt.ToByteArray();
        byte[] packet  = ArrayPool<byte>.Shared.Rent(1 + payload.Length);
        packet[0] = 0x20;
        payload.CopyTo(packet, 1);
        session.Kcp?.Send(packet.AsSpan(0, 1 + payload.Length));
        session.Kcp?.Update((uint)Environment.TickCount64);
        ArrayPool<byte>.Shared.Return(packet);

        OnPlayerDisconnected(session.ConvId);
    }

    private static long GetMicroseconds() => 
        Stopwatch.GetTimestamp() * 1_000_000L / Stopwatch.Frequency;
}
