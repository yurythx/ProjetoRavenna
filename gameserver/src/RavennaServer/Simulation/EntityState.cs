using System.Threading.Channels;
using RavennaServer.Network;

namespace RavennaServer.Simulation;

// ── Entity position (struct — no heap allocation) ────────────────────────────

internal struct EntityPosition
{
    public int X;   // world units (centimetres)
    public int Y;
}

// ── Player session (shared between network and simulation layers) ─────────────

internal sealed class PlayerSession
{
    public readonly uint             ConvId;
    public readonly string           UserId;
    public readonly string           Hwid;
    public          System.Net.IPEndPoint RemoteEndPoint;

    // KCP connection owned by the network layer
    public KcpConnection? Kcp;

    // Lock-free channel: network thread writes, simulation thread reads
    // Item: (pooled byte[], valid length)
    public readonly Channel<(byte[] buf, int len)> ReceiveChannel =
        Channel.CreateBounded<(byte[], int)>(new BoundedChannelOptions(256)
        {
            FullMode         = BoundedChannelFullMode.DropOldest,
            SingleReader     = true,
            SingleWriter     = true,
        });

    public EntityPosition Position;
    public uint           Flags;            // bit0=moving, bit2=dead
    public long           LastHeartbeatMs;  // Environment.TickCount64

    public PlayerSession(uint convId, string userId, string hwid, System.Net.IPEndPoint ep)
    {
        ConvId          = convId;
        UserId          = userId;
        Hwid            = hwid;
        RemoteEndPoint  = ep;
        LastHeartbeatMs = Environment.TickCount64;
    }
}
