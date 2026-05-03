// =============================================================================
// EntityState.cs — Modelos de dados de sessão do jogador em memória
// =============================================================================
//
// Define duas estruturas centrais da camada de simulação:
//
//   EntityPosition  — coordenada 2D em centímetros (struct sem alocação)
//   PlayerSession   — estado completo de um jogador conectado
//
// PlayerSession é criada por UdpSocketListener no handshake e destruída
// quando o jogador desconecta ou o heartbeat expira (30 s sem atividade).
// É compartilhada entre a thread de rede e a thread de simulação através
// de um Channel<> lock-free (ReceiveChannel).
//
// Campos agrupados:
//   Identidade    — ConvId, UserId, Hwid, RemoteEndPoint
//   Rede          — Kcp, ReceiveChannel
//   Posição       — Position, Destination, IsMoving, LastHeartbeatMs
//   Flags (bitfield enviado em todo snapshot):
//     bit0 = moving  bit1 = attacking  bit2 = dead  bit3 = npc(sempre 0 para player)
//   Identidade do personagem — Class, Race, Faction, Level
//   Atributos base — Strength, Agility, Intelligence, Vitality
//   Stats derivados — PhysicalDamage, MagicalDamage, PhysDefense, MagDefense
//   DamageMode     — Physical | Magical | Hybrid (determinado no handshake)
//   Combate        — CurrentHp/Mana, MaxHp/Mana, AttackRange, CombatTargetId
//   Grupo          — PartyId (null = solo)
//   Habilidades    — SkillCooldowns, SkillLevels
//   Efeitos ativos — ActiveEffects (buffs e debuffs com expiração em ms)
//
// Convenção de coordenadas:
//   Todo movimento é em centímetros (cm).
//   O mundo tem WORLD_WIDTH × WORLD_HEIGHT cm (padrão 10000 × 10000).
//   AttackRange padrão = 150 cm (~1.5 m)
//   MovementSpeed padrão = 400 cm/s (4 m/s)
//
// Nota sobre DamageMode:
//   Inferido em UdpSocketListener.HandleHandshake a partir da classe e do
//   equipamento. Ver DamageMode.cs e AttributeCalculator.InferDamageMode().
// =============================================================================
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
    public EntityPosition Destination;
    public bool           IsMoving;
    public long           LastHeartbeatMs;

    // ── Flags (bit field sent in every snapshot) ─────────────────────────────
    // bit0=moving, bit1=attacking, bit2=dead, bit3=npc
    public uint Flags;

    // ── Character identity (loaded from Django at handshake) ─────────────────
    public CharacterClass Class;
    public Race           Race;
    public Faction        Faction;
    public int            Level;

    // ── Base attributes ───────────────────────────────────────────────────────
    public int Strength;
    public int Agility;
    public int Intelligence;
    public int Vitality;

    // ── Derived combat stats (computed by AttributeCalculator at handshake) ──
    public int   PhysicalDamage;   // STR/AGI + equip phys_damage bonus
    public int   MagicalDamage;    // INT    + equip mag_damage  bonus
    public int   PhysDefense;      // VIT    + equip phys_defense (armor + shield phys)
    public int   MagDefense;       // VIT+INT + equip mag_defense (armor + shield mag)

    // ── Damage mode (determined at handshake from class + equipped weapon) ───
    // Physical : sword, dagger, bow  — single mitigation against PhysDefense
    // Magical  : staff, wand          — single mitigation against MagDefense
    // Hybrid   : mace, hammer, lance  — both components applied, each mitigated separately
    public DamageMode DamageMode;

    // ── Combat ────────────────────────────────────────────────────────────────
    public int         CurrentHp;
    public int         MaxHp;
    public int         CurrentMana;
    public int         MaxMana;
    public int         AttackRange;
    public int         MovementSpeed;
    public float       AttackCooldownSec;
    public CombatState State;
    public uint        CombatTargetId;
    public long        LastAttackMs;
    public long        DeathTimeMs;
    public EntityPosition SpawnPoint;

    /// <summary>
    /// Damage used for skills and NPC attacks (Phase 1 simplification):
    /// magic classes → MagicalDamage; hybrid/physical classes → PhysicalDamage.
    /// Auto-attacks against players use AttributeCalculator.ApplyDamage() instead,
    /// which handles Hybrid by applying both components with separate mitigation.
    /// </summary>
    public int AttackDamage => DamageMode == DamageMode.Magical ? MagicalDamage : PhysicalDamage;

    /// <summary>
    /// Raw damage for NPC attacks (no mitigation on NPC side in Phase 1):
    /// Hybrid = both components summed.
    /// </summary>
    public int RawAutoAttackDamage => DamageMode switch
    {
        DamageMode.Magical => MagicalDamage,
        DamageMode.Hybrid  => PhysicalDamage + MagicalDamage,
        _                  => PhysicalDamage,
    };

    // Party the player belongs to (null = solo); populated at handshake from Django
    public string? PartyId;

    // Per-skill cooldown tracking: skill_id → timestamp when it becomes available
    public readonly Dictionary<uint, long> SkillCooldowns = new(8);

    // Per-skill level (populated from Django at handshake; default 1 if absent)
    public readonly Dictionary<uint, int> SkillLevels = new(8);

    // Active buffs and debuffs (pruned each tick before combat)
    public readonly List<ActiveEffect> ActiveEffects = new(4);

    /// <summary>Sums the percentage magnitude of all active effects of a given type.</summary>
    public int SumEffectPct(EffectType type, long nowMs)
    {
        int total = 0;
        foreach (var e in ActiveEffects)
            if (e.IsActive(nowMs) && e.EffectType == type)
                total += e.Value;
        return total;
    }

    public const int RESPAWN_DELAY_MS = 10_000;

    public bool IsDead => State == CombatState.Dead;

    public PlayerSession(uint convId, string userId, string hwid, System.Net.IPEndPoint ep)
    {
        ConvId          = convId;
        UserId          = userId;
        Hwid            = hwid;
        RemoteEndPoint  = ep;
        LastHeartbeatMs = Environment.TickCount64;

        Class            = CharacterClass.None;
        Race             = Race.None;
        Faction          = Faction.None;
        Level            = 1;
        Strength         = 10;
        Agility          = 10;
        Intelligence     = 10;
        Vitality         = 10;

        PhysicalDamage    = AttributeCalculator.PhysicalDamage(10, 10, 0);
        MagicalDamage     = AttributeCalculator.MagicalDamage(10, 0);
        PhysDefense       = AttributeCalculator.PhysDefense(10, 0);
        MagDefense        = AttributeCalculator.MagDefense(10, 10, 0);
        DamageMode        = DamageMode.Physical;
        MaxHp             = AttributeCalculator.MaxHp(10, 0);
        CurrentHp         = MaxHp;
        MaxMana           = AttributeCalculator.MaxMana(10, 0);
        CurrentMana       = MaxMana;
        AttackRange       = 150;
        MovementSpeed     = AttributeCalculator.MoveSpeed(10, 0);
        AttackCooldownSec = AttributeCalculator.AttackCooldown(10, 0f);
        State             = CombatState.Idle;
        SpawnPoint        = new EntityPosition { X = 5000, Y = 5000 };
    }
}
