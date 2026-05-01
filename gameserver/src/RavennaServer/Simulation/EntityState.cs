using System.Threading.Channels;
using RavennaServer.Network;
using RavennaServer.Simulation;

namespace RavennaServer.Simulation;

// ── World position (struct — no heap allocation) ─────────────────────────────

internal struct EntityPosition
{
    public int X;   // world units (centimetres)
    public int Y;
}

// ── Player session (shared between network and simulation layers) ─────────────

internal sealed class PlayerSession
{
    // ── Identity ──────────────────────────────────────────────────────────────
    public readonly uint                    ConvId;
    public readonly string                  UserId;
    public readonly string                  Hwid;
    public          System.Net.IPEndPoint   RemoteEndPoint;

    // KCP connection owned by the network layer
    public KcpConnection? Kcp;

    // Lock-free channel: network thread writes, simulation thread reads
    public readonly Channel<(byte[] buf, int len)> ReceiveChannel =
        Channel.CreateBounded<(byte[], int)>(new BoundedChannelOptions(256)
        {
            FullMode     = BoundedChannelFullMode.DropOldest,
            SingleReader = true,
            SingleWriter = true,
        });

    // ── Position & movement ───────────────────────────────────────────────────
    public EntityPosition Position;
    public EntityPosition Destination;      // click-to-move target (authoritative)
    public bool           IsMoving;         // server is steering toward Destination
    public long           LastHeartbeatMs;

    // ── Flags (bit field sent in every snapshot) ─────────────────────────────
    // bit0=moving, bit1=attacking, bit2=dead, bit3=npc
    public uint Flags;

    // ── Combat ────────────────────────────────────────────────────────────────
    public int         CurrentHp;
    public int         MaxHp;
    public int         AttackDamage;        // base damage per hit
    public int         AttackRange;         // centimetres
    public int         MovementSpeed;       // centimetres per second
    public float       AttackCooldownSec;   // seconds between hits
    public CombatState State;               // current state-machine state
    public uint        CombatTargetId;      // entity_id of current target (0 = none)
    public long        LastAttackMs;        // timestamp of last attack
    public long        DeathTimeMs;         // when the player died (for respawn timer)
    public EntityPosition SpawnPoint;       // position to respawn at

    // Per-skill cooldown tracking: skill_id → timestamp when it becomes available again
    public readonly Dictionary<uint, long> SkillCooldowns = new(8);

    public const int RESPAWN_DELAY_MS = 10_000;  // 10 s

    // ── Derived helpers ───────────────────────────────────────────────────────
    public bool IsDead => State == CombatState.Dead;

    public PlayerSession(uint convId, string userId, string hwid, System.Net.IPEndPoint ep)
    {
        ConvId          = convId;
        UserId          = userId;
        Hwid            = hwid;
        RemoteEndPoint  = ep;
        LastHeartbeatMs = Environment.TickCount64;

        // Default player stats — override with real values from Django on handshake
        MaxHp            = 100;
        CurrentHp        = 100;
        AttackDamage     = 10;
        AttackRange      = 150;     // 1.5 m
        MovementSpeed    = 400;     // 4 m/s
        AttackCooldownSec = 1.0f;
        State             = CombatState.Idle;
        SpawnPoint        = new EntityPosition { X = 5000, Y = 5000 };  // default map center
    }
}
