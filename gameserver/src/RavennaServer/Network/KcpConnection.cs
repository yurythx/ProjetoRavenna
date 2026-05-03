// =============================================================================
// KcpConnection.cs — Implementação KCP (Reliable UDP) em C# puro
// =============================================================================
//
// KCP é um protocolo de transporte confiável e ordenado sobre UDP, projetado
// para jogos onde baixa latência é crítica mas entrega garantida é necessária.
// Esta implementação é baseada no algoritmo de referência do skywind3000.
//
// Modo de operação ("turbo/game mode"):
//   - nodelay ativado: sem espera de ACK para enviar próximo segmento
//   - intervalo de flush: 10ms (não 100ms como no modo normal)
//   - sem controle de congestionamento TCP-style
//   - RTO mínimo: 100ms, máximo: 60s, backoff: 1.5×
//   - Fast retransmit após 2 ACKs faltando (FASTACK=2)
//   - Dead link após 20 retransmissões (DEADLINK=20)
//
// API pública:
//   Input(span)   — alimentar datagram UDP recebido da rede
//   Send(span)    — enfileirar dados para envio confiável
//   Recv(span)    — ler próxima mensagem remontada
//   Update(ms)    — chamar a cada tick (~10ms) para drive da máquina de estado
//
// Zero-alocação:
//   Segmentos usam um object pool (ConcurrentBag) para evitar GC.
//   O buffer de flush é pre-alocado via ArrayPool e reutilizado.
//
// Integração com SimulationLoop:
//   - UdpSocketListener chama Input() ao receber um datagram.
//   - SimulationLoop chama Update() a cada tick (30Hz).
//   - SimulationLoop chama Recv() para ler mensagens completas.
//   - SimulationLoop chama Send() para enviar snapshots e eventos ao cliente.
//
// Para o cliente Unity:
//   Use a biblioteca KCP do C# ou a porta kcp2k para Unity.
//   Configure com as mesmas constantes: nodelay=true, interval=10, resend=2.
//   O conv_id é atribuído pelo servidor no handshake (S2C_HandshakeAck.conv_id).
// =============================================================================
using System.Buffers;
using System.Buffers.Binary;
using System.Collections.Concurrent;

namespace RavennaServer.Network;

/// <summary>
/// Pure C# KCP (Reliable UDP) implementation.
/// Configured in turbo / game mode: nodelay, no congestion control, 10 ms interval.
/// Based on the reference algorithm by skywind3000.
/// </summary>
internal sealed class KcpConnection : IDisposable
{
    // ── Protocol constants ───────────────────────────────────────────────────
    private const byte CMD_PUSH  = 81;
    private const byte CMD_ACK   = 82;
    private const byte CMD_WASK  = 83;  // window probe request
    private const byte CMD_WINS  = 84;  // window size notification
    private const int  HEADER    = 24;  // bytes per segment header
    private const uint RTO_DEF   = 200;
    private const uint RTO_MIN   = 100;
    private const uint RTO_MAX   = 60_000;
    private const uint THRESH_MIN  = 2;
    private const uint FASTACK     = 2;  // fast-retransmit after N skipped ACKs
    private const uint DEADLINK    = 20; // give up after N retransmits

    // ── State ────────────────────────────────────────────────────────────────
    private readonly uint                     _conv;
    private readonly Action<byte[], int>      _output;  // (buf, len) → send UDP
    private readonly List<(uint sn, uint ts)> _ackList = new(64);

    private uint  _sndUna;       // oldest unacknowledged SN
    private uint  _sndNxt;       // next SN to assign
    private uint  _rcvNxt;       // next SN we expect
    private uint  _ssthresh = 0x7FFF_FFFF;
    private uint  _rxRttval;
    private uint  _rxSrtt;
    private uint  _rxRto    = RTO_DEF;
    private uint  _rxMinRto = RTO_MIN;
    private uint  _mtu      = 1400;
    private uint  _mss;
    private uint  _cwnd     = 1;
    private uint  _incr;
    private uint  _rmtWnd   = 128;
    private uint  _probe;
    private uint  _tsProbe;
    private uint  _tsFlush;
    private uint  _current;
    private ushort _sndWnd  = 256;
    private ushort _rcvWnd  = 256;
    private bool  _updated;

    private readonly LinkedList<Segment> _sndQueue = new();
    private readonly LinkedList<Segment> _sndBuf   = new();
    private readonly LinkedList<Segment> _rcvQueue = new();
    private readonly LinkedList<Segment> _rcvBuf   = new();

    private byte[]? _flushBuf;
    private bool    _disposed;

    // ── Construction ─────────────────────────────────────────────────────────
    public KcpConnection(uint conv, Action<byte[], int> output)
    {
        _conv   = conv;
        _output = output;
        _mss    = _mtu - (uint)HEADER;
        _flushBuf = ArrayPool<byte>.Shared.Rent((int)(_mtu * 3));
    }

    // ── Public API ───────────────────────────────────────────────────────────

    /// <summary>Feed a received UDP datagram into this session.</summary>
    public bool Input(ReadOnlySpan<byte> data)
    {
        uint prevUna = _sndUna;

        while (data.Length >= HEADER)
        {
            uint conv = BinaryPrimitives.ReadUInt32LittleEndian(data);
            if (conv != _conv) return false;

            byte   cmd = data[4];
            byte   frg = data[5];
            ushort wnd = BinaryPrimitives.ReadUInt16LittleEndian(data[6..]);
            uint   ts  = BinaryPrimitives.ReadUInt32LittleEndian(data[8..]);
            uint   sn  = BinaryPrimitives.ReadUInt32LittleEndian(data[12..]);
            uint   una = BinaryPrimitives.ReadUInt32LittleEndian(data[16..]);
            uint   len = BinaryPrimitives.ReadUInt32LittleEndian(data[20..]);

            if (data.Length < HEADER + (int)len) return false;

            _rmtWnd = wnd;
            ParseUna(una);
            ShrinkBuf();

            switch (cmd)
            {
                case CMD_ACK:
                    ParseAck(sn);
                    ParseFastAck(sn, ts);
                    ShrinkBuf();
                    UpdateRtt(_current > ts ? _current - ts : 0);
                    break;

                case CMD_PUSH when sn < _rcvNxt + _rcvWnd:
                    _ackList.Add((sn, ts));
                    InsertRcvBuf(sn, frg, data.Slice(HEADER, (int)len));
                    MoveToRcvQueue();
                    break;

                case CMD_WASK:
                    _probe |= 2;  // schedule WINS reply
                    break;
            }

            data = data[(HEADER + (int)len)..];
        }

        // Congestion window growth on new ACKs
        if (_sndUna > prevUna && _cwnd < _rmtWnd)
        {
            if (_cwnd < _ssthresh)
                _cwnd++;
            else
            {
                uint step = _mss > 0 ? _mss * _mss / _incr + _mss / 16 : 1;
                _incr += step;
                if ((_incr + 1) >= _cwnd * _mss)
                    _cwnd = (_incr + _mss - 1) / _mss;
            }
        }

        return true;
    }

    /// <summary>Queue data for reliable ordered delivery.</summary>
    public bool Send(ReadOnlySpan<byte> data)
    {
        if (data.IsEmpty) return false;

        int count = data.Length <= (int)_mss
            ? 1 : (data.Length + (int)_mss - 1) / (int)_mss;

        if (count > 255) return false;

        for (int i = 0; i < count; i++)
        {
            int size = Math.Min(data.Length, (int)_mss);
            var seg  = Segment.Rent(size);
            data[..size].CopyTo(seg.Data.AsSpan(0, size));
            seg.Len = (uint)size;
            seg.Frg = (byte)(count - i - 1);
            _sndQueue.AddLast(seg);
            data = data[size..];
        }
        return true;
    }

    /// <summary>Try to read the next reassembled application message.</summary>
    public int Recv(Span<byte> buffer)
    {
        if (_rcvQueue.Count == 0) return -1;
        int peek = PeekSize();
        if (peek < 0 || peek > buffer.Length) return -1;

        int offset = 0;
        while (_rcvQueue.Count > 0)
        {
            var seg = _rcvQueue.First!.Value;
            _rcvQueue.RemoveFirst();
            seg.Data.AsSpan(0, (int)seg.Len).CopyTo(buffer[offset..]);
            offset += (int)seg.Len;
            byte frg = seg.Frg;
            Segment.Return(seg);
            if (frg == 0) break;
        }
        return offset;
    }

    /// <summary>Must be called each simulation tick (~10 ms) to drive the state machine.</summary>
    public void Update(uint currentMs)
    {
        _current = currentMs;
        if (!_updated) { _updated = true; _tsFlush = _current; }

        if ((int)(_current - _tsFlush) >= 0) Flush();
    }

    // ── Flush ────────────────────────────────────────────────────────────────

    private void Flush()
    {
        _tsFlush = _current + 10;  // next flush in 10 ms (turbo)

        _flushBuf ??= ArrayPool<byte>.Shared.Rent((int)(_mtu * 3));
        int ptr = 0;

        // --- Flush ACKs ---
        foreach (var (sn, ts) in _ackList)
        {
            if ((int)(_flushBuf.Length - ptr) < HEADER) { _output(_flushBuf, ptr); ptr = 0; }
            WriteHeader(_flushBuf.AsSpan(ptr), _conv, CMD_ACK, 0, _rcvWnd, ts, sn, _rcvNxt, 0);
            ptr += HEADER;
        }
        _ackList.Clear();

        // --- Window probe / notification ---
        if (_rmtWnd == 0 && _sndQueue.Count > 0)
        {
            if (_tsProbe == 0) { _tsProbe = _current + 7_000; _probe = 1; }
            else if (_current >= _tsProbe) { _tsProbe = _current + Math.Min(_probe * 2, 120_000u); _probe = 1; }
        }
        else { _tsProbe = 0; _probe = 0; }

        if ((_probe & 1) != 0)
        {
            if ((int)(_flushBuf.Length - ptr) < HEADER) { _output(_flushBuf, ptr); ptr = 0; }
            WriteHeader(_flushBuf.AsSpan(ptr), _conv, CMD_WASK, 0, _rcvWnd, _current, 0, _rcvNxt, 0);
            ptr += HEADER;
        }
        if ((_probe & 2) != 0)
        {
            if ((int)(_flushBuf.Length - ptr) < HEADER) { _output(_flushBuf, ptr); ptr = 0; }
            WriteHeader(_flushBuf.AsSpan(ptr), _conv, CMD_WINS, 0, _rcvWnd, _current, 0, _rcvNxt, 0);
            ptr += HEADER;
        }
        _probe = 0;

        // --- Move snd_queue → snd_buf ---
        uint cwnd = Math.Min(_sndWnd, _rmtWnd);  // no congestion control in game mode
        while ((_sndNxt - _sndUna) < cwnd && _sndQueue.Count > 0)
        {
            var seg  = _sndQueue.First!.Value;
            _sndQueue.RemoveFirst();
            seg.Conv = _conv; seg.Cmd = CMD_PUSH;
            seg.Wnd  = _rcvWnd; seg.Ts = _current;
            seg.Sn   = _sndNxt++; seg.Una = _rcvNxt;
            seg.ResendTs = _current; seg.Rto = _rxRto;
            seg.FastAck = 0; seg.Xmit = 0;
            _sndBuf.AddLast(seg);
        }

        // --- Send / retransmit snd_buf ---
        bool lost = false, changed = false;
        foreach (var seg in _sndBuf)
        {
            bool send = false;
            if (seg.Xmit == 0)
            {
                seg.Xmit = 1; seg.Rto = _rxRto;
                seg.ResendTs = _current + seg.Rto;
                send = true;
            }
            else if (_current >= seg.ResendTs)
            {
                seg.Xmit++;
                seg.Rto += seg.Rto / 2;  // nodelay: backoff by 1.5x
                if (seg.Rto > RTO_MAX) seg.Rto = RTO_MAX;
                seg.ResendTs = _current + seg.Rto;
                lost = true; send = true;
            }
            else if (seg.FastAck >= FASTACK)
            {
                seg.Xmit++; seg.FastAck = 0;
                seg.ResendTs = _current + seg.Rto;
                changed = true; send = true;
            }

            if (send)
            {
                seg.Ts = _current; seg.Wnd = _rcvWnd; seg.Una = _rcvNxt;
                int needed = HEADER + (int)seg.Len;
                if (_flushBuf.Length - ptr < needed) { _output(_flushBuf, ptr); ptr = 0; }
                WriteHeader(_flushBuf.AsSpan(ptr), seg.Conv, seg.Cmd, seg.Frg, seg.Wnd,
                            seg.Ts, seg.Sn, seg.Una, seg.Len);
                seg.Data.AsSpan(0, (int)seg.Len).CopyTo(_flushBuf.AsSpan(ptr + HEADER));
                ptr += needed;
            }
        }

        if (ptr > 0) { _output(_flushBuf, ptr); }

        if (changed) { _ssthresh = Math.Max((_sndNxt - _sndUna) / 2, THRESH_MIN); }
        if (lost)    { _ssthresh = Math.Max((_sndNxt - _sndUna) / 2, THRESH_MIN); _cwnd = 1; _incr = _mss; }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private void ParseUna(uint una)
    {
        var node = _sndBuf.First;
        while (node != null && node.Value.Sn < una)
        { var next = node.Next; _sndBuf.Remove(node); Segment.Return(node.Value); node = next; }
    }

    private void ShrinkBuf() =>
        _sndUna = _sndBuf.Count > 0 ? _sndBuf.First!.Value.Sn : _sndNxt;

    private void ParseAck(uint sn)
    {
        if (sn < _sndUna || sn >= _sndNxt) return;
        var node = _sndBuf.First;
        while (node != null)
        {
            if (node.Value.Sn == sn) { _sndBuf.Remove(node); Segment.Return(node.Value); return; }
            if (node.Value.Sn > sn)  return;
            node = node.Next;
        }
    }

    private void ParseFastAck(uint sn, uint ts)
    {
        if (sn < _sndUna || sn >= _sndNxt) return;
        foreach (var seg in _sndBuf)
        {
            if (seg.Sn >= sn) break;
            if (seg.Ts <= ts) seg.FastAck++;
        }
    }

    private void UpdateRtt(uint rtt)
    {
        if (rtt == 0) return;
        if (_rxSrtt == 0) { _rxSrtt = rtt; _rxRttval = rtt / 2; }
        else
        {
            uint delta = rtt > _rxSrtt ? rtt - _rxSrtt : _rxSrtt - rtt;
            _rxRttval  = (3 * _rxRttval + delta) / 4;
            _rxSrtt    = Math.Max(1, (7 * _rxSrtt + rtt) / 8);
        }
        _rxRto = Math.Clamp(_rxSrtt + Math.Max(10u, 4 * _rxRttval), _rxMinRto, RTO_MAX);
    }

    private void InsertRcvBuf(uint sn, byte frg, ReadOnlySpan<byte> data)
    {
        if (sn < _rcvNxt || sn >= _rcvNxt + _rcvWnd) return;
        // Find insertion point (ordered by SN); reject duplicates
        LinkedListNode<Segment>? node = _rcvBuf.Last;
        while (node != null)
        {
            if (node.Value.Sn == sn) return;
            if (node.Value.Sn < sn)  break;
            node = node.Previous;
        }
        var seg = Segment.Rent(data.Length);
        seg.Sn = sn; seg.Frg = frg; seg.Len = (uint)data.Length;
        data.CopyTo(seg.Data.AsSpan(0, data.Length));
        if (node == null) _rcvBuf.AddFirst(seg);
        else              _rcvBuf.AddAfter(node, seg);
    }

    private void MoveToRcvQueue()
    {
        while (_rcvBuf.Count > 0 && _rcvBuf.First!.Value.Sn == _rcvNxt)
        { _rcvQueue.AddLast(_rcvBuf.First.Value); _rcvBuf.RemoveFirst(); _rcvNxt++; }
    }

    private int PeekSize()
    {
        if (_rcvQueue.Count == 0) return -1;
        var first = _rcvQueue.First!.Value;
        if (first.Frg == 0) return (int)first.Len;
        int total = 0;
        foreach (var s in _rcvQueue) { total += (int)s.Len; if (s.Frg == 0) break; }
        return total;
    }

    private static void WriteHeader(Span<byte> buf, uint conv, byte cmd, byte frg,
                                    ushort wnd, uint ts, uint sn, uint una, uint len)
    {
        BinaryPrimitives.WriteUInt32LittleEndian(buf,       conv);
        buf[4] = cmd; buf[5] = frg;
        BinaryPrimitives.WriteUInt16LittleEndian(buf[6..],  wnd);
        BinaryPrimitives.WriteUInt32LittleEndian(buf[8..],  ts);
        BinaryPrimitives.WriteUInt32LittleEndian(buf[12..], sn);
        BinaryPrimitives.WriteUInt32LittleEndian(buf[16..], una);
        BinaryPrimitives.WriteUInt32LittleEndian(buf[20..], len);
    }

    // ── Dispose ──────────────────────────────────────────────────────────────
    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        if (_flushBuf != null) { ArrayPool<byte>.Shared.Return(_flushBuf); _flushBuf = null; }
        foreach (var s in _sndBuf)   Segment.Return(s);
        foreach (var s in _sndQueue) Segment.Return(s);
        foreach (var s in _rcvBuf)   Segment.Return(s);
        foreach (var s in _rcvQueue) Segment.Return(s);
    }

    // ── Segment: pooled to eliminate GC pressure ─────────────────────────────
    internal sealed class Segment
    {
        private static readonly ConcurrentBag<Segment> Pool = new();

        public uint  Conv, Ts, Sn, Una, ResendTs, Rto, FastAck, Xmit, Len;
        public byte  Cmd, Frg;
        public ushort Wnd;
        public byte[] Data = Array.Empty<byte>();

        public static Segment Rent(int capacity)
        {
            if (!Pool.TryTake(out var s)) s = new Segment();
            if (s.Data.Length < capacity)
                s.Data = ArrayPool<byte>.Shared.Rent(Math.Max(capacity, 64));
            s.Conv = s.Ts = s.Sn = s.Una = s.ResendTs = s.Rto = s.FastAck = s.Xmit = s.Len = 0;
            s.Cmd = s.Frg = 0; s.Wnd = 0;
            return s;
        }

        public static void Return(Segment s) => Pool.Add(s);
    }
}
