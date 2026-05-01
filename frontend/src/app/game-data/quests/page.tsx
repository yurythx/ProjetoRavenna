"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type { QuestTemplate } from "@/types";

// ── Constants ──────────────────────────────────────────────────────────────────

const QUEST_TYPES: { value: string; label: string; icon: string; color: string }[] = [
  { value: "",           label: "Todas",      icon: "◈", color: "var(--rv-text-muted)" },
  { value: "main",       label: "História",   icon: "★", color: "var(--rv-gold)" },
  { value: "side",       label: "Secundária", icon: "◆", color: "var(--rv-accent)" },
  { value: "daily",      label: "Diária",     icon: "◉", color: "var(--rv-cyan)" },
  { value: "repeatable", label: "Repetível",  icon: "↺", color: "#22c55e" },
];

const TYPE_COLORS: Record<string, string> = {
  main:       "var(--rv-gold)",
  side:       "var(--rv-accent)",
  daily:      "var(--rv-cyan)",
  repeatable: "#22c55e",
};

// ── Fetch hook ─────────────────────────────────────────────────────────────────

type Filters = { quest_type: string; level: string };

function useQuests(filters: Filters) {
  return useQuery({
    queryKey: ["game-logic", "quest-templates", filters],
    queryFn: async (): Promise<QuestTemplate[]> => {
      const params = new URLSearchParams();
      if (filters.quest_type) params.set("quest_type", filters.quest_type);
      if (filters.level)      params.set("level",      filters.level);
      const res = await api.get(`/game-logic/quest-templates/?${params.toString()}`);
      return res.data;
    },
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  });
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function RewardBadge({ icon, value, label }: { icon: string; value: number; label: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-1 text-[10px]">
      <span>{icon}</span>
      <span className="font-mono font-bold text-[var(--rv-text-primary)]">{value.toLocaleString()}</span>
      <span className="text-[var(--rv-text-dim)]">{label}</span>
    </div>
  );
}

function QuestCard({ quest }: { quest: QuestTemplate }) {
  const [expanded, setExpanded] = useState(false);
  const color = TYPE_COLORS[quest.quest_type] ?? "var(--rv-text-muted)";
  const typeInfo = QUEST_TYPES.find((t) => t.value === quest.quest_type);

  return (
    <div
      className="rv-card p-5 flex flex-col gap-4 transition-all duration-200 hover:border-[var(--rv-border-hover)]"
      style={{ borderLeftColor: `${color}55`, borderLeftWidth: 2 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className="rv-label text-[8px] px-2 py-0.5 rounded-full border"
              style={{ color, borderColor: `${color}55`, background: `${color}11` }}
            >
              {typeInfo?.icon} {quest.quest_type_display}
            </span>
            {quest.is_repeatable && (
              <span className="rv-label text-[8px] px-2 py-0.5 rounded-full border border-[#22c55e]/30 text-[#22c55e] bg-[#22c55e]/10">
                ↺ Repetível
              </span>
            )}
          </div>
          <h3 className="rv-display text-base text-white leading-tight">{quest.name}</h3>
        </div>
        <div className="flex-shrink-0 text-right">
          <span className="rv-label text-[9px] text-[var(--rv-text-dim)] block">Nível Mínimo</span>
          <span className="rv-display text-lg text-[var(--rv-accent)]">{quest.level_required}</span>
        </div>
      </div>

      {/* Description */}
      {quest.description && (
        <p className="text-xs text-[var(--rv-text-muted)] leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
          {quest.description}
        </p>
      )}

      {/* Rewards */}
      {(quest.rewards.xp || quest.rewards.gold || quest.rewards.items?.length) ? (
        <div className="rounded-xl bg-[var(--rv-surface-2)] border border-[var(--rv-border)] p-3">
          <span className="rv-label text-[8px] text-[var(--rv-text-dim)] block mb-2">Recompensas</span>
          <div className="flex flex-wrap gap-3">
            <RewardBadge icon="✨" value={quest.rewards.xp ?? 0}   label="XP"   />
            <RewardBadge icon="💰" value={quest.rewards.gold ?? 0} label="Gold" />
            {quest.rewards.items && quest.rewards.items.length > 0 && (
              <div className="flex items-center gap-1 text-[10px]">
                <span>📦</span>
                <span className="font-mono font-bold text-[var(--rv-text-primary)]">{quest.rewards.items.length}</span>
                <span className="text-[var(--rv-text-dim)]">{quest.rewards.items.length === 1 ? "item" : "itens"}</span>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Objectives toggle */}
      {quest.objectives.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1.5 text-[10px] text-[var(--rv-text-dim)] hover:text-[var(--rv-text-muted)] transition-colors rv-label"
          >
            <span className={`transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}>▶</span>
            {quest.objectives.length} {quest.objectives.length === 1 ? "objetivo" : "objetivos"}
          </button>
          {expanded && (
            <ul className="mt-2 space-y-1.5">
              {quest.objectives.map((obj, i) => (
                <li key={obj.key ?? i} className="flex items-start gap-2 text-[11px]">
                  <span className="text-[var(--rv-text-dim)] mt-0.5 flex-shrink-0">◦</span>
                  <span className="text-[var(--rv-text-muted)]" style={{ fontFamily: "var(--font-body)" }}>
                    {obj.description}
                    {obj.target_count > 1 && (
                      <span className="ml-1 font-mono text-[var(--rv-accent)]">×{obj.target_count}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rv-card p-5 space-y-3 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-1.5 flex-1">
          <div className="h-4 w-20 rounded-full bg-[var(--rv-surface-2)]" />
          <div className="h-4 w-3/4 rounded bg-[var(--rv-surface-2)]" />
        </div>
        <div className="h-8 w-8 rounded bg-[var(--rv-surface-2)]" />
      </div>
      <div className="h-3 w-full rounded bg-[var(--rv-surface-2)]" />
      <div className="h-3 w-2/3 rounded bg-[var(--rv-surface-2)]" />
      <div className="rounded-xl bg-[var(--rv-surface-2)] h-12" />
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function QuestsPage() {
  const [filters, setFilters] = useState<Filters>({ quest_type: "", level: "" });
  const [levelInput, setLevelInput] = useState("");

  const { data, isLoading, isFetching } = useQuests(filters);

  const setFilter = useCallback(<K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleLevelSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const n = parseInt(levelInput, 10);
    setFilter("level", isNaN(n) || n < 1 ? "" : String(n));
  }, [levelInput, setFilter]);

  const clearLevel = useCallback(() => {
    setLevelInput("");
    setFilter("level", "");
  }, [setFilter]);

  const byType: Record<string, QuestTemplate[]> = {};
  for (const q of data ?? []) {
    const key = q.quest_type;
    if (!byType[key]) byType[key] = [];
    byType[key].push(q);
  }

  const sortOrder = ["main", "side", "daily", "repeatable"];
  const groupedEntries = sortOrder
    .filter((t) => byType[t]?.length)
    .map((t) => ({ type: t, quests: byType[t] }));

  return (
    <div className="relative min-h-screen">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="rv-orb" style={{ width: 400, height: 400, top: "-10%", left: "-5%", background: "var(--rv-gold)", opacity: 0.04 }} />
      </div>

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <span className="rv-badge rv-badge-purple mb-3 inline-flex">📜 Game Data</span>
          <h1 className="rv-display text-4xl text-white">Missões</h1>
          <p className="mt-2 text-sm text-[var(--rv-text-muted)]" style={{ fontFamily: "var(--font-body)" }}>
            Catálogo público de missões disponíveis no servidor.
            {data && <span className="ml-2 text-[var(--rv-text-dim)]">({data.length} missões)</span>}
          </p>
        </div>

        {/* Filters */}
        <div className="rv-card p-4 mb-6 flex flex-col sm:flex-row gap-3 flex-wrap">
          {/* Quest type tabs */}
          <div className="flex gap-1.5 flex-wrap flex-1">
            {QUEST_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setFilter("quest_type", t.value)}
                className="rv-label text-[9px] px-3 py-1.5 rounded-full border transition-all"
                style={
                  filters.quest_type === t.value
                    ? { color: t.color, borderColor: t.color, background: `${t.color}18` }
                    : { color: "var(--rv-text-dim)", borderColor: "var(--rv-border)" }
                }
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Level filter */}
          <form onSubmit={handleLevelSubmit} className="flex gap-2 items-center">
            <input
              type="number"
              min={1}
              value={levelInput}
              onChange={(e) => setLevelInput(e.target.value)}
              placeholder="Nível máx..."
              className="w-28 bg-[var(--rv-surface)] border border-[var(--rv-border)] rounded-xl px-3 py-2 text-sm text-[var(--rv-text-primary)] placeholder-[var(--rv-text-dim)] focus:outline-none focus:border-[var(--rv-accent)] transition-colors"
            />
            <button type="submit" className="rv-btn rv-btn-primary px-4 py-2 text-sm">Filtrar</button>
            {filters.level && (
              <button type="button" onClick={clearLevel} className="rv-btn px-3 py-2 text-sm">✕</button>
            )}
          </form>
        </div>

        {/* Active filter chips */}
        {(filters.quest_type || filters.level) && (
          <div className="flex gap-2 mb-4 flex-wrap">
            {filters.quest_type && (
              <span className="rv-badge rv-badge-purple text-[10px] flex items-center gap-1">
                {QUEST_TYPES.find((t) => t.value === filters.quest_type)?.label}
                <button onClick={() => setFilter("quest_type", "")} className="ml-1 hover:text-white">×</button>
              </span>
            )}
            {filters.level && (
              <span className="rv-badge rv-badge-cyan text-[10px] flex items-center gap-1">
                Lv. ≤ {filters.level}
                <button onClick={clearLevel} className="ml-1 hover:text-white">×</button>
              </span>
            )}
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : !data?.length ? (
          <div className="rv-card p-16 text-center">
            <div className="text-5xl mb-4">📜</div>
            <h3 className="rv-display text-2xl text-white mb-2">Nenhuma missão encontrada</h3>
            <p className="text-sm text-[var(--rv-text-muted)]" style={{ fontFamily: "var(--font-body)" }}>
              Tente outros filtros ou aguarde novas missões serem cadastradas.
            </p>
          </div>
        ) : filters.quest_type ? (
          // Flat list when filtering by type
          <div className={`space-y-4 transition-opacity ${isFetching ? "opacity-60" : "opacity-100"}`}>
            {data.map((q) => <QuestCard key={q.id} quest={q} />)}
          </div>
        ) : (
          // Grouped by type when showing all
          <div className={`space-y-8 transition-opacity ${isFetching ? "opacity-60" : "opacity-100"}`}>
            {groupedEntries.map(({ type, quests }) => {
              const info = QUEST_TYPES.find((t) => t.value === type)!;
              return (
                <section key={type}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="rv-label text-xs" style={{ color: info.color }}>
                      {info.icon} {info.label}
                    </span>
                    <div className="flex-1 h-px bg-[var(--rv-border)]" />
                    <span className="rv-label text-[9px] text-[var(--rv-text-dim)]">{quests.length}</span>
                  </div>
                  <div className="space-y-3">
                    {quests.map((q) => <QuestCard key={q.id} quest={q} />)}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
