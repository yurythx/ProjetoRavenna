"use client";

import { PlayerStats } from "@/types";
import { useAllocatePoints } from "../hooks/use-allocate-points";

type Props = { stats: PlayerStats };

const STAT_BARS = [
  { label: "Força",       key: "strength",     color: "var(--rv-red)",    icon: "⚔" },
  { label: "Agilidade",   key: "agility",      color: "var(--rv-cyan)",   icon: "💨" },
  { label: "Inteligência",key: "intelligence", color: "var(--rv-accent)", icon: "✦" },
  { label: "Vitalidade",  key: "vitality",     color: "var(--rv-gold)",   icon: "❤" },
] as const;

export function PlayerStatsCard({ stats }: Props) {
  const allocatePoints = useAllocatePoints();

  const handleAllocate = (attr: "strength" | "agility" | "intelligence" | "vitality") => {
    if (stats.points_remaining > 0) allocatePoints.mutate({ [attr]: 1 });
  };

  const xpToNext = (stats.level * 1000);
  const xpPct = Math.min((stats.experience / xpToNext) * 100, 100);

  return (
    <div className="rv-card p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="rv-badge rv-badge-purple mb-2 inline-flex">⚔ Status</span>
          <h3 className="rv-display text-xl text-white">Personagem</h3>
        </div>
        {stats.points_remaining > 0 && (
          <div className="rv-card px-4 py-2 border-[var(--rv-gold)]/40 text-center"
            style={{ background: "rgba(234,179,8,0.07)" }}>
            <div className="rv-display text-xl text-[var(--rv-gold)]">{stats.points_remaining}</div>
            <div className="rv-label text-[8px] text-[var(--rv-text-dim)]">Pontos</div>
          </div>
        )}
      </div>

      {/* Level + XP */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="rv-display text-2xl text-[var(--rv-accent)]">Lv {stats.level}</span>
          </div>
          <span className="rv-label text-[9px] text-[var(--rv-text-dim)]">{stats.experience.toLocaleString()} / {xpToNext.toLocaleString()} XP</span>
        </div>
        <div className="h-2 w-full rounded-full bg-[var(--rv-surface-2)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${xpPct}%`, background: "linear-gradient(90deg, var(--rv-accent), var(--rv-cyan))" }}
          />
        </div>
      </div>

      {/* HP / MP */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "HP", val: stats.health, max: stats.max_health, color: "var(--rv-red)" },
          { label: "MP", val: stats.mana, max: stats.max_mana, color: "var(--rv-accent)" },
        ].map((bar) => (
          <div key={bar.label} className="rv-card p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="rv-label text-[9px] text-[var(--rv-text-dim)]">{bar.label}</span>
              <span className="rv-label text-[9px] text-[var(--rv-text-muted)]">{bar.val}/{bar.max}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-[var(--rv-surface-2)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min((bar.val / bar.max) * 100, 100)}%`, background: bar.color }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Stat bars */}
      <div className="space-y-4">
        {STAT_BARS.map((item) => {
          const val = stats[item.key];
          return (
            <div key={item.key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{item.icon}</span>
                  <span className="rv-label text-[10px] text-[var(--rv-text-muted)]">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rv-display text-sm text-white">{val}</span>
                  {stats.points_remaining > 0 && (
                    <button
                      type="button"
                      onClick={() => handleAllocate(item.key)}
                      disabled={allocatePoints.isPending}
                      className="h-5 w-5 rounded-full border border-[var(--rv-border)] bg-[var(--rv-surface-2)] text-[var(--rv-accent)] text-xs font-black hover:border-[var(--rv-accent)] hover:bg-[var(--rv-accent-glow)] transition-all disabled:opacity-30"
                    >
                      +
                    </button>
                  )}
                </div>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[var(--rv-surface-2)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min((val / 150) * 100, 100)}%`, background: item.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
