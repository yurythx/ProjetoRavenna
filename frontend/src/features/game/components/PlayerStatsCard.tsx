/**
 * @module PlayerStatsCard
 *
 * Card interativo de status do personagem, usado em páginas de perfil (/me)
 * e no painel de jogo. Exibe nível, XP, HP/MP e atributos com botões de
 * alocação de ponto quando `points_remaining > 0`.
 *
 * ## Responsabilidade
 * - Mostrar nível atual e barra de progressão de XP (level × 1000 por nível).
 * - Exibir barras de HP e MP com valor atual/máximo.
 * - Listar atributos (Força, Agilidade, Inteligência, Vitalidade) com barras
 *   relativas a um cap visual de 150.
 * - Quando há pontos disponíveis (`points_remaining > 0`), exibir botão `+`
 *   ao lado de cada atributo para alocar 1 ponto de cada vez.
 * - Chamar a mutação via `useAllocatePoints` ao clicar no `+`, atualizando o
 *   cache do React Query sem novo fetch completo (`setQueryData`).
 *
 * ## Como Usar
 * ```tsx
 * import { PlayerStatsCard } from "@/features/game/components/PlayerStatsCard";
 *
 * <PlayerStatsCard stats={playerStats} />
 * ```
 *
 * ## Props
 * - `stats` — objeto `PlayerStats` com level, experience, health, mana,
 *   strength, agility, intelligence, vitality, points_remaining.
 *
 * ## Dependências Internas
 * - `use-allocate-points.ts` — mutation que faz POST /api/v1/game-logic/stats/allocate/
 *   via axios e atualiza o cache de ["player-data"] com a resposta.
 *
 * ## Observações
 * - O botão `+` fica desabilitado enquanto a mutation está pendente (isPending).
 * - Cada clique aloca exatamente 1 ponto no atributo selecionado.
 * - Para a versão com alocação em lote (múltiplos pontos de uma vez), use o
 *   `InventoryPanel` integrado ao `play/page.tsx` que acumula antes de confirmar.
 */
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
