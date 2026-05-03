"use client";

import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import type { PlayerInventory, PlayerSkill } from "@/types";
import { InventoryPanel } from "@/features/game/components/InventoryPanel";
import { SkillBar }       from "@/features/game/components/SkillBar";
import { QuestTracker }   from "@/features/game/components/QuestTracker";

// ── Types ────────────────────────────────────────────────────────────────────

type Stats = {
  level: number;
  experience: number;
  health: number;
  max_health: number;
  mana: number;
  max_mana: number;
  strength: number;
  agility: number;
  intelligence: number;
  vitality: number;
  points_remaining: number;
  faction: string;
  character_class: string;
  race: string;
};

type PlayData = { stats: Stats; skills: PlayerSkill[]; inventory: PlayerInventory };

// ── Static data ──────────────────────────────────────────────────────────────

const CLASS_OPTIONS = [
  { value: "paladino",         label: "Paladino",      icon: "🛡", role: "Tank",        color: "#f59e0b", desc: "Guerreiro sagrado com alta defesa e cura." },
  { value: "cavaleiro_dragao", label: "Cav. Dragão",   icon: "🐉", role: "Tank",        color: "#ef4444", desc: "Tank que domina armas híbridas e dano duplo." },
  { value: "mage",             label: "Mage",          icon: "✨", role: "Mago DPS",    color: "#06b6d4", desc: "Mestre do gelo com alto dano mágico." },
  { value: "eldari",           label: "Eldari",        icon: "🌿", role: "Mago Suporte",color: "#10b981", desc: "Elfo arcano especialista em cura e suporte." },
  { value: "ignis",            label: "Ignis",         icon: "🔥", role: "Mago DPS",    color: "#f97316", desc: "Mago do fogo com explosões em área." },
  { value: "necromante",       label: "Necromante",    icon: "💀", role: "Mago DPS",    color: "#8b5cf6", desc: "Manipulador das trevas com magia sombria." },
  { value: "archer",           label: "Archer",        icon: "🏹", role: "DPS Ranged",  color: "#84cc16", desc: "Arqueiro preciso com alto alcance." },
  { value: "shadow",           label: "Shadow",        icon: "🗡", role: "DPS Melee",   color: "#64748b", desc: "Assassino furtivo com dual wield." },
] as const;

const RACE_OPTIONS = [
  { value: "humano",     label: "Humano",     icon: "👤", desc: "Versátil e adaptável a qualquer classe." },
  { value: "elfo",       label: "Elfo",       icon: "🌙", desc: "Ágil e com forte afinidade mágica." },
  { value: "draconato",  label: "Draconato",  icon: "🐲", desc: "Sangue dracônico — resistência e força." },
  { value: "morto_vivo", label: "Morto-Vivo", icon: "💀", desc: "Resiliente às trevas e à magia sombria." },
] as const;

const FACTION_OPTIONS = [
  { value: "vanguarda", label: "Vanguarda da Alvorada", icon: "⚔",  color: "#f59e0b", desc: "A ordem da luz que protege o reino." },
  { value: "legiao",    label: "Legião do Eclipse",     icon: "🌑",  color: "#8b5cf6", desc: "A força das sombras que reivindica o poder." },
] as const;

// ── Data fetch ───────────────────────────────────────────────────────────────

async function fetchPlayData(): Promise<PlayData> {
  const res = await fetch("/api/game/player", { cache: "no-store" });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatBar({ label, cur, max, color }: { label: string; cur: number; max: number; color: string }) {
  const p = Math.round(Math.min(100, (cur / Math.max(1, max)) * 100));
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="rv-label text-[9px] text-[var(--rv-text-dim)] tracking-[0.25em]">{label}</span>
        <span className="rv-label text-[9px] text-[var(--rv-text-muted)]">{cur} / {max}</span>
      </div>
      <div className="h-2 rounded-full bg-[var(--rv-surface-2)] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${p}%`, background: color }} />
      </div>
    </div>
  );
}

function AttrItem({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl bg-[var(--rv-surface-2)] border border-[var(--rv-border)] p-3 text-center">
      <span className="rv-label text-[8px] text-[var(--rv-text-dim)] block mb-1">{label}</span>
      <span className="rv-display text-2xl" style={{ color }}>{value}</span>
    </div>
  );
}

type Tab = "stats" | "inventory" | "skills" | "quests";

const TABS: { id: Tab; label: string }[] = [
  { id: "stats",     label: "Personagem" },
  { id: "inventory", label: "Inventário" },
  { id: "skills",    label: "Habilidades" },
  { id: "quests",    label: "Missões" },
];

function CharacterPanel({ data, heroName, onLaunch, launching, onRefresh }: {
  data: PlayData;
  heroName: string;
  onLaunch: () => void;
  launching: boolean;
  onRefresh: () => void;
}) {
  const { stats, skills, inventory } = data;
  const [tab, setTab] = useState<Tab>("stats");

  const cls     = CLASS_OPTIONS.find(c => c.value === stats.character_class);
  const race    = RACE_OPTIONS.find(r => r.value === stats.race);
  const faction = FACTION_OPTIONS.find(f => f.value === stats.faction);

  return (
    <div className="space-y-6">
      {/* ── Hero header ── */}
      <div className="rv-card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div
            className="relative h-16 w-16 flex-shrink-0 rounded-2xl flex items-center justify-center text-3xl border"
            style={{ background: `${cls?.color ?? "#8b5cf6"}18`, borderColor: `${cls?.color ?? "var(--rv-border)"}55` }}
          >
            {cls?.icon ?? "⚔"}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="rv-display text-2xl text-white">{heroName}</h2>
              <span className="rv-badge rv-badge-purple text-[10px]">Lv. {stats.level}</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {cls && (
                <span className="rv-label text-[9px] px-2 py-1 rounded-full" style={{ background: `${cls.color}1a`, color: cls.color, border: `1px solid ${cls.color}44` }}>
                  {cls.icon} {cls.label} · {cls.role}
                </span>
              )}
              {race && (
                <span className="rv-label text-[9px] px-2 py-1 rounded-full bg-[var(--rv-surface-2)] border border-[var(--rv-border)] text-[var(--rv-text-muted)]">
                  {race.icon} {race.label}
                </span>
              )}
              {faction && (
                <span className="rv-label text-[9px] px-2 py-1 rounded-full" style={{ background: `${faction.color}1a`, color: faction.color, border: `1px solid ${faction.color}44` }}>
                  {faction.icon} {faction.label}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onLaunch}
            disabled={launching}
            className="rv-btn rv-btn-primary px-8 h-11 text-sm flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {launching ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Iniciando...
              </span>
            ) : "⚔ Jogar Ravenna"}
          </button>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 border-b border-[var(--rv-border)] pb-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className="rv-label text-[10px] px-4 py-2.5 rounded-t-xl border-b-2 transition-all tracking-[0.2em]"
            style={{
              borderBottomColor: tab === t.id ? "var(--rv-accent)" : "transparent",
              color:             tab === t.id ? "var(--rv-accent)" : "var(--rv-text-dim)",
              background:        tab === t.id ? "var(--rv-accent)/6" : "transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="rv-card p-6 min-h-[320px]">
        {tab === "stats" && (
          <div className="space-y-5">
            <StatBar label="HP"   cur={stats.health} max={stats.max_health} color="#ef4444" />
            <StatBar label="MANA" cur={stats.mana}   max={stats.max_mana}   color="#8b5cf6" />
            <div className="grid grid-cols-2 gap-3 pt-1">
              <AttrItem label="FOR" value={stats.strength}     color="#f59e0b" />
              <AttrItem label="AGI" value={stats.agility}      color="#10b981" />
              <AttrItem label="INT" value={stats.intelligence} color="#06b6d4" />
              <AttrItem label="VIT" value={stats.vitality}     color="#ef4444" />
            </div>
            {stats.points_remaining > 0 && (
              <div className="p-3 rounded-xl border border-[var(--rv-accent)]/30 bg-[var(--rv-accent)]/5 text-center">
                <span className="rv-label text-[9px] text-[var(--rv-accent)] tracking-[0.3em]">
                  {stats.points_remaining} PONTOS DISPONÍVEIS
                </span>
              </div>
            )}
            <div className="pt-1">
              <div className="flex justify-between mb-1">
                <span className="rv-label text-[9px] text-[var(--rv-text-dim)] tracking-[0.25em]">XP</span>
                <span className="rv-label text-[9px] text-[var(--rv-text-muted)]">{stats.experience.toLocaleString("pt-BR")}</span>
              </div>
              <div className="h-1.5 rounded-full bg-[var(--rv-surface-2)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--rv-accent)] to-[var(--rv-cyan)]"
                  style={{ width: `${Math.min(100, Math.round((stats.experience / Math.max(1, stats.level * 1000)) * 100))}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {tab === "inventory" && (
          <InventoryPanel inventory={inventory} onInventoryChange={onRefresh} />
        )}

        {tab === "skills" && (
          <SkillBar skills={skills} gold={inventory.gold} onSkillChange={onRefresh} />
        )}

        {tab === "quests" && (
          <QuestTracker />
        )}
      </div>
    </div>
  );
}

function CharacterCreateForm({ onCreated }: { onCreated: () => void }) {
  const [cls,     setCls]     = useState("");
  const [race,    setRace]    = useState("");
  const [faction, setFaction] = useState("");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const selectedCls     = CLASS_OPTIONS.find(c => c.value === cls);
  const selectedRace    = RACE_OPTIONS.find(r => r.value === race);
  const selectedFaction = FACTION_OPTIONS.find(f => f.value === faction);
  const canSubmit       = !!cls && !!race && !!faction && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/game/character/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ character_class: cls, race, faction }),
      });
      if (res.status === 409) { setError("Este personagem já foi criado."); return; }
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        setError(body?.error ?? "Erro ao criar personagem.");
        return;
      }
      onCreated();
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="rv-card p-8">
        <div className="text-center mb-10">
          <span className="rv-badge rv-badge-purple mb-4 inline-flex">✦ Criação de Personagem</span>
          <h2 className="rv-display text-3xl text-white mt-2">Escolha sua Identidade</h2>
          <p className="text-[var(--rv-text-muted)] mt-2 text-sm" style={{ fontFamily: "var(--font-body)" }}>
            Escolha permanente — define seus atributos iniciais e habilidades de partida.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Classe */}
          <section>
            <span className="rv-label text-[10px] text-[var(--rv-text-dim)] tracking-[0.3em] block mb-3">CLASSE</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CLASS_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCls(c.value)}
                  className="rounded-xl border transition-all p-3 text-center hover:scale-[1.02]"
                  style={{
                    background:  cls === c.value ? `${c.color}18` : "var(--rv-surface-2)",
                    borderColor: cls === c.value ? c.color         : "var(--rv-border)",
                    boxShadow:   cls === c.value ? `0 0 12px ${c.color}30` : "none",
                  }}
                >
                  <div className="text-2xl mb-1">{c.icon}</div>
                  <div className="rv-label text-[9px] text-[var(--rv-text-primary)] block">{c.label}</div>
                  <div className="rv-label text-[8px] text-[var(--rv-text-dim)] mt-0.5 block">{c.role}</div>
                </button>
              ))}
            </div>
            {selectedCls && (
              <p className="mt-2 text-xs text-[var(--rv-text-muted)] px-1" style={{ fontFamily: "var(--font-body)" }}>
                {selectedCls.desc}
              </p>
            )}
          </section>

          {/* Raça */}
          <section>
            <span className="rv-label text-[10px] text-[var(--rv-text-dim)] tracking-[0.3em] block mb-3">RAÇA</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {RACE_OPTIONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRace(r.value)}
                  className="rounded-xl border transition-all p-3 text-center hover:scale-[1.02]"
                  style={{
                    background:  race === r.value ? "rgba(139,92,246,0.12)" : "var(--rv-surface-2)",
                    borderColor: race === r.value ? "var(--rv-accent)"       : "var(--rv-border)",
                    boxShadow:   race === r.value ? "0 0 10px rgba(139,92,246,0.25)" : "none",
                  }}
                >
                  <div className="text-2xl mb-1">{r.icon}</div>
                  <div className="rv-label text-[9px] text-[var(--rv-text-primary)] block">{r.label}</div>
                </button>
              ))}
            </div>
            {selectedRace && (
              <p className="mt-2 text-xs text-[var(--rv-text-muted)] px-1" style={{ fontFamily: "var(--font-body)" }}>
                {selectedRace.desc}
              </p>
            )}
          </section>

          {/* Facção */}
          <section>
            <span className="rv-label text-[10px] text-[var(--rv-text-dim)] tracking-[0.3em] block mb-3">FACÇÃO</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FACTION_OPTIONS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFaction(f.value)}
                  className="rounded-xl border transition-all p-4 text-left hover:scale-[1.01]"
                  style={{
                    background:  faction === f.value ? `${f.color}15` : "var(--rv-surface-2)",
                    borderColor: faction === f.value ? f.color         : "var(--rv-border)",
                    boxShadow:   faction === f.value ? `0 0 14px ${f.color}30` : "none",
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xl">{f.icon}</span>
                    <span className="rv-display text-base" style={{ color: faction === f.value ? f.color : "var(--rv-text-primary)" }}>
                      {f.label}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--rv-text-dim)]" style={{ fontFamily: "var(--font-body)" }}>{f.desc}</p>
                </button>
              ))}
            </div>
          </section>

          {cls && race && faction && selectedCls && selectedRace && selectedFaction && (
            <div className="rounded-xl border border-[var(--rv-border)] bg-[var(--rv-surface-2)] p-4 flex flex-wrap gap-2 items-center">
              <span className="rv-label text-[9px] text-[var(--rv-text-dim)] tracking-[0.3em] mr-1">RESUMO</span>
              <span className="rv-label text-[9px] px-2 py-1 rounded-full" style={{ background: `${selectedCls.color}1a`, color: selectedCls.color, border: `1px solid ${selectedCls.color}44` }}>
                {selectedCls.icon} {selectedCls.label}
              </span>
              <span className="rv-label text-[9px] px-2 py-1 rounded-full bg-[var(--rv-surface)] border border-[var(--rv-border)] text-[var(--rv-text-muted)]">
                {selectedRace.icon} {selectedRace.label}
              </span>
              <span className="rv-label text-[9px] px-2 py-1 rounded-full" style={{ background: `${selectedFaction.color}1a`, color: selectedFaction.color, border: `1px solid ${selectedFaction.color}44` }}>
                {selectedFaction.icon} {selectedFaction.label}
              </span>
            </div>
          )}

          {error && (
            <div className="rv-badge rv-badge-red text-center w-full py-2 block">{error}</div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="rv-btn rv-btn-primary w-full h-12 text-base disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 rounded-full border-t-2 border-white animate-spin" />
                Criando...
              </span>
            ) : "✦ Confirmar Criação"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PlayPage() {
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [launching, setLaunching] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["play-data"],
    queryFn: fetchPlayData,
    enabled: !!user,
    retry: false,
  });

  const handleLaunch = useCallback(() => {
    setLaunching(true);
    const clientId = crypto.randomUUID();
    router.push(`/auth/unity-callback?client_id=${clientId}`);
  }, [router]);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["play-data"] });
  }, [queryClient]);

  if (authLoading || (!!user && isLoading)) {
    return (
      <div className="flex min-h-[calc(100dvh-5rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 rounded-full border-2 border-[var(--rv-accent)] opacity-20" />
            <div className="absolute inset-0 rounded-full border-t-2 border-[var(--rv-accent)] animate-spin" />
            <div className="absolute inset-3 rounded-full bg-[var(--rv-accent)]/10" />
          </div>
          <span className="rv-label text-[10px] text-[var(--rv-text-dim)] tracking-[0.4em]">Carregando Herói...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[calc(100dvh-5rem)] flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="rv-badge rv-badge-red inline-flex">⚠ Acesso Negado</div>
        <h1 className="rv-display text-4xl text-white">Entre para Jogar</h1>
        <p className="text-[var(--rv-text-muted)] max-w-sm" style={{ fontFamily: "var(--font-body)" }}>
          Você precisa estar logado para acessar o Portal do Herói.
        </p>
        <Link href={`/login?next=${encodeURIComponent("/play")}`} className="rv-btn rv-btn-primary px-10 h-12">
          <span>⚡</span> Entrar no Portal
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[calc(100dvh-5rem)] flex-col items-center justify-center gap-4">
        <div className="rv-badge rv-badge-red inline-flex">Erro ao carregar dados</div>
        <button onClick={() => refetch()} className="rv-btn rv-btn-primary px-8 h-10">
          Tentar novamente
        </button>
      </div>
    );
  }

  const u = user as Record<string, unknown>;
  const heroName    = String(u?.display_name || u?.username || "Herói");
  const hasCharacter = !!data?.stats?.character_class;

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="rv-orb rv-animate-pulse-glow"
          style={{ width: "600px", height: "600px", top: "-20%", left: "-15%", background: "var(--rv-accent)", opacity: 0.12 }}
        />
        <div
          className="rv-orb"
          style={{ width: "400px", height: "400px", bottom: "-10%", right: "-10%", background: "var(--rv-cyan)", opacity: 0.08, animationDelay: "2s" }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4 py-8 sm:py-12 sm:px-6">
        <header className="mb-8">
          <span className="rv-label text-[10px] text-[var(--rv-accent)] tracking-[0.35em]">Portal do Herói</span>
          <h1 className="rv-display text-4xl sm:text-5xl text-white mt-1">
            {hasCharacter ? heroName : "Criação de Personagem"}
          </h1>
        </header>

        <div className="rv-divider mb-8" />

        {hasCharacter && data ? (
          <CharacterPanel
            data={data}
            heroName={heroName}
            onLaunch={handleLaunch}
            launching={launching}
            onRefresh={handleRefresh}
          />
        ) : (
          <>
            <CharacterCreateForm
              onCreated={() => {
                queryClient.invalidateQueries({ queryKey: ["play-data"] });
              }}
            />
            <p className="text-center text-xs text-[var(--rv-text-dim)] mt-6" style={{ fontFamily: "var(--font-body)" }}>
              Crie seu personagem para poder iniciar o Ravenna
            </p>
          </>
        )}

        <div className="flex justify-center gap-6 text-sm text-[var(--rv-text-muted)] mt-10">
          <Link href="/me" className="hover:text-[var(--rv-accent)] transition-colors">Portal do Herói</Link>
          <span className="text-[var(--rv-border)]">|</span>
          <Link href="/" className="hover:text-[var(--rv-accent)] transition-colors">Início</Link>
        </div>
      </div>
    </div>
  );
}
