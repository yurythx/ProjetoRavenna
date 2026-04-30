using System.Buffers;
using System.Collections.Concurrent;
using System.Net;
using System.Net.Sockets;
using RavennaServer.Bridge;
using RavennaServer.Proto;
using RavennaServer.Simulation;

namespace RavennaServer.Network;

/// <summary>
/// Dedicated-thread UDP socket listener.
/// Receives datagrams, distinguishes handshake packets from KCP data,
/// and routes raw bytes into per-player receive channels.
/// </summary>
internal sealed class UdpSocketListener
{
    // First 4 bytes of every handshake packet (before KCP is established)
    private const uint AUTH_MAGIC = 0xCAFE_1337;

    // MTU cap — datagrams larger than this are dropped silently
    private const int MAX_DATAGRAM = 1400;

    private readonly int             _port;
    private readonly SimulationLoop  _simLoop;
    private readonly JwtValidator    _jwt;

    // Active KCP sessions: conv_id → session
    private readonly ConcurrentDictionary<uint, PlayerSession> _sessions = new();

    // Monotonic session ID counter
    private uint _nextConv = 1;

    public UdpSocketListener(int port, SimulationLoop simLoop, JwtValidator jwt)
    {
        _port    = port;
        _simLoop = simLoop;
        _jwt     = jwt;
    }

    public Task RunAsync(CancellationToken ct) =>
        Task.Factory.StartNew(() => ReceiveLoop(ct),
            ct, TaskCreationOptions.LongRunning, TaskScheduler.Default);

    // ── Receive loop (dedicated OS thread) ───────────────────────────────────

    private void ReceiveLoop(CancellationToken ct)
    {
        using var socket = new Socket(AddressFamily.InterNetwork, SocketType.Dgram, ProtocolType.Udp);
        socket.Bind(new IPEndPoint(IPAddress.Any, _port));
        socket.ReceiveTimeout = 500;

        // Pre-allocate a single receive buffer per thread — no alloc in hot path
        byte[] buf = ArrayPool<byte>.Shared.Rent(MAX_DATAGRAM);

        try
        {
            EndPoint remote = new IPEndPoint(IPAddress.Any, 0);

            while (!ct.IsCancellationRequested)
            {
                int received;
                try { received = socket.ReceiveFrom(buf, ref remote); }
                catch (SocketException ex) when (ex.SocketErrorCode == SocketError.TimedOut) { continue; }

                if (received < 4) continue;

                var data = buf.AsSpan(0, received);

                // Detect handshake by magic prefix (first 4 bytes)
                uint magic = System.Buffers.Binary.BinaryPrimitives.ReadUInt32LittleEndian(data);
                if (magic == AUTH_MAGIC)
                    HandleHandshake(data[4..], (IPEndPoint)remote, socket);
                else
                    RouteKcpPacket(data, (IPEndPoint)remote, socket);
            }
        }
        finally
        {
            ArrayPool<byte>.Shared.Return(buf);
        }
    }

    // ── Handshake ─────────────────────────────────────────────────────────────

    private void HandleHandshake(ReadOnlySpan<byte> payload, IPEndPoint remote, Socket socket)
    {
        C2S_Handshake hs;
        try { hs = C2S_Handshake.Parser.ParseFrom(payload.ToArray()); }
        catch { SendHandshakeAck(socket, remote, 0, ok: false, "malformed"); return; }

        string? userId = _jwt.Validate(hs.JwtToken);
        if (userId is null)
        { SendHandshakeAck(socket, remote, 0, ok: false, "invalid_token"); return; }

        // Reject duplicate HWID (one active session per hardware device)
        foreach (var (_, s) in _sessions)
            if (s.Hwid == hs.Hwid && s.UserId != userId)
            { SendHandshakeAck(socket, remote, 0, ok: false, "hwid_conflict"); return; }

        // Assign a new KCP conversation
        uint conv = Interlocked.Increment(ref _nextConv);
        var session = new PlayerSession(conv, userId, hs.Hwid, remote);
        session.Kcp = new KcpConnection(conv, (bytes, len) =>
        {
            socket.SendTo(bytes.AsSpan(0, len), remote);
        });

        _sessions[conv] = session;
        _simLoop.OnPlayerConnected(session);

        SendHandshakeAck(socket, remote, conv, ok: true, "");
    }

    private static void SendHandshakeAck(Socket socket, IPEndPoint remote,
                                          uint conv, bool ok, string reason)
    {
        var ack = new S2C_HandshakeAck { ConvId = conv, Ok = ok, Reason = reason };
        byte[] bytes = ack.ToByteArray();

        // Prefix with AUTH_MAGIC so the client identifies this as a non-KCP response
        byte[] packet = ArrayPool<byte>.Shared.Rent(4 + bytes.Length);
        System.Buffers.Binary.BinaryPrimitives.WriteUInt32LittleEndian(packet, AUTH_MAGIC);
        bytes.CopyTo(packet, 4);
        socket.SendTo(packet.AsSpan(0, 4 + bytes.Length), remote);
        ArrayPool<byte>.Shared.Return(packet);
    }

    // ── KCP routing ──────────────────────────────────────────────────────────

    private void RouteKcpPacket(ReadOnlySpan<byte> data, IPEndPoint remote, Socket socket)
    {
        if (data.Length < 4) return;
        uint conv = System.Buffers.Binary.BinaryPrimitives.ReadUInt32LittleEndian(data);

        if (!_sessions.TryGetValue(conv, out var session)) return;

        // Copy to pooled buffer before handing to simulation thread
        byte[] copy = ArrayPool<byte>.Shared.Rent(data.Length);
        data.CopyTo(copy);
        session.ReceiveChannel.Writer.TryWrite((copy, data.Length));
    }

    // ── Session removal (called by simulation on disconnect/timeout) ─────────
    public void RemoveSession(uint conv)
    {
        if (_sessions.TryRemove(conv, out var s)) s.Kcp?.Dispose();
    }
}
