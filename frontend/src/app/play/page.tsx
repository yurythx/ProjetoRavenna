/**
 * @module PlayPage (/play)
 *
 * Página principal do jogo — agora com suporte total a múltiplos personagens.
 */
"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import type { PlayerInventory, PlayerSkill } from "@/types";
import { InventoryPanel } from "@/features/game/components/InventoryPanel";
import { SkillBar }       from "@/features/game/components/SkillBar";
import { PartyPanel }     from "@/features/game/components/PartyPanel";
import { QuestTracker }   from "@/features/game/components/QuestTracker";

// ── Types ────────────────────────────────────────────────────────────────────

type Character = {
  id: string;
  name: string;
  character_class: string;
  race: string;
  faction: string;
  created_at: string;
};

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

// ── Data fetches ─────────────────────────────────────────────────────────────

async function fetchCharacters(): Promise<Character[]> {
  const res = await fetch("/api/game/characters", { cache: "no-store" });
  if (!res.ok) throw new Error("Erro ao carregar heróis");
  return res.json();
}

async function fetchPlayData(characterId: string): Promise<PlayData> {
  const res = await fetch(`/api/game/player?character_id=${characterId}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Erro ao carregar dados do herói");
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

function AttrItem({
  label, value, color, pending = 0, onAdd, onSub, hasPoints,
}: {
  label: string; value: number; color: string;
  pending?: number; onAdd?: () => void; onSub?: () => void; hasPoints?: boolean;
}) {
  return (
    <div className="rounded-xl bg-[var(--rv-surface-2)] border border-[var(--rv-border)] p-3 text-center">
      <span className="rv-label text-[8px] text-[var(--rv-text-dim)] block mb-1">{label}</span>
      <div className="flex items-center justify-center gap-1.5">
        {onSub && pending > 0 && (
          <button
            type="button"
            onClick={onSub}
            className="h-5 w-5 rounded-full bg-[var(--rv-surface)] border border-[var(--rv-border)] text-[var(--rv-text-dim)] text-xs hover:border-red-500/40 hover:text-red-400 transition-colors leading-none"
          >
            −
          </button>
        )}
        <span className="rv-display text-2xl" style={{ color }}>
          {value}
          {pending > 0 && (
            <span className="text-base ml-0.5" style={{ color: "var(--rv-accent)" }}>
              +{pending}
            </span>
          )}
        </span>
        {onAdd && hasPoints && (
          <button
            type="button"
            onClick={onAdd}
            className="h-5 w-5 rounded-full bg-[var(--rv-accent)]/20 border border-[var(--rv-accent)]/40 text-[var(--rv-accent)] text-xs hover:bg-[var(--rv-accent)]/30 transition-colors leading-none"
          >
            +
          </button>
        )}
      </div>
    </div>
  );
}

type Tab = "stats" | "inventory" | "skills" | "quests" | "party";

const TABS: { id: Tab; label: string }[] = [
  { id: "stats",     label: "Personagem" },
  { id: "inventory", label: "Inventário" },
  { id: "skills",    label: "Habilidades" },
  { id: "quests",    label: "Missões" },
  { id: "party",     label: "Grupo" },
];

type AllocAttrs = { strength: number; agility: number; intelligence: number; vitality: number };

function CharacterPanel({ data, char, userId, onLaunch, launching, onRefresh, onBack }: {
  data: PlayData;
  char: Character;
  userId: string;
  onLaunch: () => void;
  launching: boolean;
  onRefresh: () => void;
  onBack: () => void;
}) {
  const { stats, skills, inventory } = data;
  const [tab, setTab] = useState<Tab>("stats");

  // ── Point allocation ────────────────────────────────────────────────────
  const [pending, setPending] = useState<AllocAttrs>({ strength: 0, agility: 0, intelligence: 0, vitality: 0 });
  const [allocating, setAllocating] = useState(false);
  const [allocError, setAllocError] = useState("");
  const totalPending = pending.strength + pending.agility + pending.intelligence + pending.vitality;
  const remainingAfter = stats.points_remaining - totalPending;

  function inc(attr: keyof AllocAttrs) {
    if (remainingAfter <= 0) return;
    setPending((p) => ({ ...p, [attr]: p[attr] + 1 }));
  }
  function dec(attr: keyof AllocAttrs) {
    if (pending[attr] <= 0) return;
    setPending((p) => ({ ...p, [attr]: p[attr] - 1 }));
  }
  async function confirmAlloc() {
    if (totalPending === 0) return;
    setAllocating(true);
    setAllocError("");
    const res = await fetch("/api/game/stats/allocate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...pending, character_id: char.id }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      setAllocError(body?.error ?? "Erro ao alocar pontos.");
    } else {
      setPending({ strength: 0, agility: 0, intelligence: 0, vitality: 0 });
      onRefresh();
    }
    setAllocating(false);
  }

  const cls     = CLASS_OPTIONS.find(c => c.value === char.character_class);
  const race    = RACE_OPTIONS.find(r => r.value === char.race);
  const faction = FACTION_OPTIONS.find(f => f.value === char.faction);

  return (
    <div className="space-y-6">
      {/* ── Hero header ── */}
      <div className="rv-card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <button 
            onClick={onBack}
            className="h-10 w-10 flex items-center justify-center rounded-xl bg-[var(--rv-surface-2)] border border-[var(--rv-border)] text-[var(--rv-text-dim)] hover:text-white transition-all"
          >
            ←
          </button>
          
          <div
            className="relative h-16 w-16 flex-shrink-0 rounded-2xl flex items-center justify-center text-3xl border"
            style={{ background: `${cls?.color ?? "#8b5cf6"}18`, borderColor: `${cls?.color ?? "var(--rv-border)"}55` }}
          >
            {cls?.icon ?? "⚔"}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h2 className="rv-display text-2xl text-white">{char.name}</h2>
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
              <AttrItem label="FOR" value={stats.strength}     color="#f59e0b" pending={pending.strength}     onAdd={() => inc("strength")}     onSub={() => dec("strength")}     hasPoints={remainingAfter > 0} />
              <AttrItem label="AGI" value={stats.agility}      color="#10b981" pending={pending.agility}      onAdd={() => inc("agility")}      onSub={() => dec("agility")}      hasPoints={remainingAfter > 0} />
              <AttrItem label="INT" value={stats.intelligence} color="#06b6d4" pending={pending.intelligence} onAdd={() => inc("intelligence")} onSub={() => dec("intelligence")} hasPoints={remainingAfter > 0} />
              <AttrItem label="VIT" value={stats.vitality}     color="#ef4444" pending={pending.vitality}     onAdd={() => inc("vitality")}     onSub={() => dec("vitality")}     hasPoints={remainingAfter > 0} />
            </div>

            {stats.points_remaining > 0 && (
              <div className="rounded-xl border border-[var(--rv-accent)]/30 bg-[var(--rv-accent)]/5 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="rv-label text-[9px] text-[var(--rv-accent)] tracking-[0.3em]">
                    {remainingAfter} PONTO{remainingAfter !== 1 ? "S" : ""} DISPONÍVE{remainingAfter !== 1 ? "IS" : "L"}
                  </span>
                  {totalPending > 0 && (
                    <span className="rv-label text-[9px] text-[var(--rv-text-dim)]">
                      {totalPending} a confirmar
                    </span>
                  )}
                </div>
                {totalPending > 0 && (
                  <>
                    {allocError && (
                      <span className="rv-label text-[9px] text-red-400 block">{allocError}</span>
                    )}
                    <button
                      type="button"
                      onClick={confirmAlloc}
                      disabled={allocating}
                      className="rv-btn rv-btn-primary w-full h-8 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {allocating ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="h-3 w-3 rounded-full border-t-2 border-white animate-spin" />
                          Confirmando...
                        </span>
                      ) : `✦ Confirmar +${totalPending} atributo${totalPending !== 1 ? "s" : ""}`}
                    </button>
                  </>
                )}
              </div>
            )}
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

        {tab === "party" && (
          <PartyPanel userId={userId} />
        )}
      </div>
    </div>
  );
}

function CharacterCreateForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [name,    setName]    = useState("");
  const [faction, setFaction] = useState("");
  const [race,    setRace]    = useState("");
  const [cls,     setCls]     = useState("");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  // ── Rules Mapping (Sync with Backend) ──
  const RULES = {
    vanguarda: {
      races: ["humano", "elfo"],
      classes: ["paladino", "mage", "archer", "eldari"]
    },
    legiao: {
      races: ["draconato", "morto_vivo"],
      classes: ["cavaleiro_dragao", "ignis", "shadow", "necromante"]
    }
  };

  const selectedCls     = CLASS_OPTIONS.find(c => c.value === cls);
  const selectedRace    = RACE_OPTIONS.find(r => r.value === race);
  const selectedFaction = FACTION_OPTIONS.find(f => f.value === faction);

  const availableRaces   = faction ? RACE_OPTIONS.filter(r => (RULES[faction as keyof typeof RULES].races as string[]).includes(r.value)) : [];
  const availableClasses = faction ? CLASS_OPTIONS.filter(c => (RULES[faction as keyof typeof RULES].classes as string[]).includes(c.value)) : [];

  const canSubmit = name.length >= 3 && !!faction && !!race && !!cls && !loading;

  const handleFactionSelect = (f: string) => {
    setFaction(f);
    setRace(""); // Reset downstream choices
    setCls("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/game/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, character_class: cls, race, faction }),
      });
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
        <div className="flex justify-between items-start mb-10">
          <div className="text-left">
            <span className="rv-badge rv-badge-purple mb-4 inline-flex">✦ Novo Herói</span>
            <h2 className="rv-display text-3xl text-white mt-2">Escolha sua Identidade</h2>
          </div>
          <button 
            onClick={onCancel}
            className="h-10 px-4 rounded-xl border border-[var(--rv-border)] text-[var(--rv-text-dim)] hover:text-white text-xs rv-label transition-all"
          >
            CANCELAR
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          <section>
            <span className="rv-label text-[10px] text-[var(--rv-text-dim)] tracking-[0.3em] block mb-3">NOME DO PERSONAGEM</span>
            <input 
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Digite o nome..."
              className="w-full bg-[var(--rv-surface-2)] border border-[var(--rv-border)] rounded-xl px-4 h-12 text-white rv-display text-lg focus:border-[var(--rv-accent)] outline-none transition-all"
              maxLength={32}
            />
          </section>

          {/* 1. Facção (Mandatória primeiro) */}
          <section>
            <span className="rv-label text-[10px] text-[var(--rv-text-dim)] tracking-[0.3em] block mb-3">PASSO 1: ESCOLHA SUA FACÇÃO</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FACTION_OPTIONS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => handleFactionSelect(f.value)}
                  className="rounded-xl border transition-all p-4 text-left hover:scale-[1.01]"
                  style={{
                    background:  faction === f.value ? `${f.color}15` : "var(--rv-surface-2)",
                    borderColor: faction === f.value ? f.color         : "var(--rv-border)",
                    boxShadow:   faction === f.value ? `0 0 20px ${f.color}25` : "none"
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xl">{f.icon}</span>
                    <span className="rv-display text-base" style={{ color: faction === f.value ? f.color : "var(--rv-text-primary)" }}>
                      {f.label}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--rv-text-dim)] leading-snug" style={{ fontFamily: "var(--font-body)" }}>{f.desc}</p>
                </button>
              ))}
            </div>
          </section>

          {/* 2. Raça (Dependente da Facção) */}
          {faction && (
            <section className="animate-in fade-in slide-in-from-top-2 duration-500">
              <span className="rv-label text-[10px] text-[var(--rv-text-dim)] tracking-[0.3em] block mb-3">PASSO 2: ESCOLHA SUA RAÇA</span>
              <div className="grid grid-cols-2 gap-2">
                {availableRaces.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRace(r.value)}
                    className="rounded-xl border transition-all p-3 text-center hover:scale-[1.02]"
                    style={{
                      background:  race === r.value ? "rgba(139,92,246,0.12)" : "var(--rv-surface-2)",
                      borderColor: race === r.value ? "var(--rv-accent)"       : "var(--rv-border)",
                    }}
                  >
                    <div className="text-2xl mb-1">{r.icon}</div>
                    <div className="rv-label text-[9px] text-[var(--rv-text-primary)] block">{r.label}</div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* 3. Classe (Dependente da Facção) */}
          {race && (
            <section className="animate-in fade-in slide-in-from-top-2 duration-500">
              <span className="rv-label text-[10px] text-[var(--rv-text-dim)] tracking-[0.3em] block mb-3">PASSO 3: ESCOLHA SUA CLASSE</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {availableClasses.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCls(c.value)}
                    className="rounded-xl border transition-all p-3 text-center hover:scale-[1.02]"
                    style={{
                      background:  cls === c.value ? `${c.color}18` : "var(--rv-surface-2)",
                      borderColor: cls === c.value ? c.color         : "var(--rv-border)",
                    }}
                  >
                    <div className="text-2xl mb-1">{c.icon}</div>
                    <div className="rv-label text-[9px] text-[var(--rv-text-primary)] block">{c.label}</div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {canSubmit && selectedFaction && selectedRace && selectedCls && (
            <div className="rounded-xl border border-[var(--rv-border)] bg-[var(--rv-accent)]/5 p-4 flex flex-wrap gap-2 items-center justify-center">
              <span className="rv-label text-[9px] text-[var(--rv-text-dim)] tracking-[0.3em] mr-1">RESUMO DO HERÓI</span>
              <span className="rv-badge rv-badge-purple">{name}</span>
              <span className="rv-label text-[9px] px-2 py-1 rounded-full" style={{ background: `${selectedFaction.color}1a`, color: selectedFaction.color, border: `1px solid ${selectedFaction.color}44` }}>
                {selectedFaction.icon} {selectedFaction.label}
              </span>
              <span className="rv-label text-[9px] px-2 py-1 rounded-full bg-[var(--rv-surface)] border border-[var(--rv-border)] text-[var(--rv-text-muted)]">
                {selectedRace.icon} {selectedRace.label}
              </span>
              <span className="rv-label text-[9px] px-2 py-1 rounded-full" style={{ background: `${selectedCls.color}1a`, color: selectedCls.color, border: `1px solid ${selectedCls.color}44` }}>
                {selectedCls.icon} {selectedCls.label}
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
                Forjando Herói...
              </span>
            ) : "✦ Confirmar Criação"}
          </button>
        </form>
      </div>
    </div>
  );
}

function CharacterList({ chars, onSelect, onCreate, onDelete }: { 
  chars: Character[]; 
  onSelect: (c: Character) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {chars.map((char) => {
          const cls = CLASS_OPTIONS.find(c => c.value === char.character_class);
          const faction = FACTION_OPTIONS.find(f => f.value === char.faction);
          return (
            <div key={char.id} className="rv-card group hover:border-[var(--rv-accent)]/50 transition-all cursor-pointer overflow-hidden relative">
              <div className="p-5 flex items-center gap-4" onClick={() => onSelect(char)}>
                <div 
                  className="h-14 w-14 rounded-xl flex items-center justify-center text-3xl border border-white/5 bg-white/5"
                  style={{ borderColor: cls ? `${cls.color}33` : undefined }}
                >
                  {cls?.icon ?? "⚔"}
                </div>
                <div className="flex-1">
                  <h3 className="rv-display text-xl text-white">{char.name}</h3>
                  <div className="flex gap-2 mt-1">
                    <span className="text-[9px] rv-label text-[var(--rv-text-dim)] tracking-wider">
                      {cls?.label} · {char.race}
                    </span>
                  </div>
                </div>
              </div>
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(char.id); }}
                  className="h-8 w-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all text-xs flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
              <div className="h-1 w-full bg-[var(--rv-surface-2)]">
                <div className="h-full bg-gradient-to-r" style={{ width: "30%", from: cls?.color, to: faction?.color }} />
              </div>
            </div>
          );
        })}
        
        <button 
          onClick={onCreate}
          className="rv-card border-dashed border-2 border-[var(--rv-border)] hover:border-[var(--rv-accent)]/50 hover:bg-[var(--rv-accent)]/5 transition-all p-5 flex flex-col items-center justify-center gap-3 text-[var(--rv-text-dim)] hover:text-[var(--rv-accent)]"
        >
          <span className="text-3xl">+</span>
          <span className="rv-label text-[10px] tracking-widest">NOVO HERÓI</span>
        </button>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function PlayPage() {
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [selectedChar, setSelectedChar] = useState<Character | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [launching, setLaunching] = useState(false);

  // 1. Fetch character list
  const { data: chars, isLoading: charsLoading, refetch: refetchChars } = useQuery({
    queryKey: ["characters"],
    queryFn: fetchCharacters,
    enabled: !!user,
  });

  // 2. Fetch specific play data when selected
  const { data: playData, isLoading: dataLoading, refetch: refetchData } = useQuery({
    queryKey: ["play-data", selectedChar?.id],
    queryFn: () => fetchPlayData(selectedChar!.id),
    enabled: !!selectedChar,
    retry: false,
  });

  const handleLaunch = useCallback(() => {
    setLaunching(true);
    const clientId = crypto.randomUUID();
    router.push(`/auth/unity-callback?client_id=${clientId}&char_id=${selectedChar?.id}`);
  }, [router, selectedChar]);

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja apagar este herói? Esta ação é permanente.")) return;
    const res = await fetch(`/api/game/characters/${id}`, { method: "DELETE" });
    if (res.ok) {
      if (selectedChar?.id === id) setSelectedChar(null);
      refetchChars();
    }
  };

  if (authLoading || charsLoading) {
    return (
      <div className="flex min-h-[calc(100dvh-5rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative h-16 w-16 animate-spin">
            <div className="absolute inset-0 rounded-full border-t-2 border-[var(--rv-accent)]" />
          </div>
          <span className="rv-label text-[10px] text-[var(--rv-text-dim)] tracking-[0.4em]">CARREGANDO...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[calc(100dvh-5rem)] flex-col items-center justify-center gap-6 px-4 text-center">
        <h1 className="rv-display text-4xl text-white">Entre para Jogar</h1>
        <Link href={`/login?next=${encodeURIComponent("/play")}`} className="rv-btn rv-btn-primary px-10 h-12">Entrar</Link>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Background Orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="rv-orb rv-animate-pulse-glow" style={{ width: "600px", height: "600px", top: "-20%", left: "-15%", background: "var(--rv-accent)", opacity: 0.12 }} />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4 py-8 sm:py-12">
        <header className="mb-8">
          <span className="rv-label text-[10px] text-[var(--rv-accent)] tracking-[0.35em]">Portal do Herói</span>
          <h1 className="rv-display text-4xl sm:text-5xl text-white mt-1">
            {isCreating ? "Criação de Herói" : selectedChar ? selectedChar.name : "Seus Heróis"}
          </h1>
        </header>

        <div className="rv-divider mb-8" />

        {isCreating ? (
          <CharacterCreateForm 
            onCreated={() => { setIsCreating(false); refetchChars(); }} 
            onCancel={() => setIsCreating(false)} 
          />
        ) : selectedChar && playData ? (
          <CharacterPanel
            data={playData}
            char={selectedChar}
            userId={String((user as any).id)}
            onLaunch={handleLaunch}
            launching={launching}
            onRefresh={refetchData}
            onBack={() => setSelectedChar(null)}
          />
        ) : (
          <CharacterList 
            chars={chars || []} 
            onSelect={setSelectedChar} 
            onCreate={() => setIsCreating(true)}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  );
}
