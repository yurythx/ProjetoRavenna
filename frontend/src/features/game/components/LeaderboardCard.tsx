/**
 * @module LeaderboardCard
 *
 * Card do ranking global dos top heróis, usado em páginas de painel e perfil.
 * Exibe os N primeiros colocados com ícones de medalha (ouro/prata/bronze),
 * avatar inicial e pontuação em XP.
 *
 * ## Responsabilidade
 * - Buscar dados do ranking via hook `useLeaderboard(limit)`.
 * - Renderizar skeleton animado durante carregamento.
 * - Exibir mensagem vazia quando não há nenhum herói ranqueado.
 * - Aplicar estilos diferenciados para top 3 (cores de medalha) e demais posições.
 * - Mostrar nota "Atualizado em tempo real via Redis" como rodapé informativo.
 *
 * ## Como Usar
 * ```tsx
 * import { LeaderboardCard } from "@/features/game/components/LeaderboardCard";
 *
 * // Exibe top 5 (limite fixado internamente)
 * <LeaderboardCard />
 * ```
 *
 * ## Sem Props
 * O componente não recebe props. O limite de resultados é fixado internamente em 5.
 * Para alterar, edite a chamada `useLeaderboard(5)` dentro do componente.
 *
 * ## Dependências Internas
 * - `use-leaderboard.ts` — hook que busca GET /api/v1/game-logic/leaderboard/
 *   via axios direto ao backend (não via Next.js API route).
 *
 * ## Observações
 * - O backend calcula o score com base em XP total acumulado.
 * - A classificação é atualizada a cada ação relevante do jogador no servidor de jogo.
 */
"use client";

import { useLeaderboard } from "../hooks/use-leaderboard";

const RANK_CONFIG = [
  { icon: "🥇", color: "var(--rv-gold)",   bg: "rgba(234,179,8,0.08)",  border: "rgba(234,179,8,0.25)" },
  { icon: "🥈", color: "#9ca3af",          bg: "rgba(156,163,175,0.05)", border: "rgba(156,163,175,0.15)" },
  { icon: "🥉", color: "#ea580c",          bg: "rgba(234,88,12,0.05)",  border: "rgba(234,88,12,0.15)" },
];

export function LeaderboardCard() {
  const { data, isLoading } = useLeaderboard(5);

  return (
    <div className="rv-card p-6 space-y-5">
      <div>
        <span className="rv-badge rv-badge-gold mb-2 inline-flex">🏆 Ranking</span>
        <h3 className="rv-display text-xl text-white">Top Heróis</h3>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 w-full animate-pulse rounded-xl bg-[var(--rv-surface-2)]" />
          ))}
        </div>
      )}

      {!isLoading && (!data?.results || data.results.length === 0) && (
        <div className="py-6 text-center">
          <div className="text-3xl mb-3">🏅</div>
          <p className="text-sm text-[var(--rv-text-muted)]" style={{ fontFamily: "var(--font-body)" }}>
            Nenhum herói no ranking ainda.
          </p>
        </div>
      )}

      {!isLoading && data?.results && data.results.length > 0 && (
        <div className="space-y-2">
          {data.results.map((entry, index) => {
            const cfg = RANK_CONFIG[index];
            return (
              <div
                key={`${entry.name}-${index}`}
                className="flex items-center justify-between rounded-xl px-4 py-3 border transition-all duration-200 hover:scale-[1.01]"
                style={{
                  background: cfg ? cfg.bg : "var(--rv-surface)",
                  borderColor: cfg ? cfg.border : "var(--rv-border)",
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg w-6 text-center flex-shrink-0">
                    {cfg ? cfg.icon : `#${index + 1}`}
                  </span>
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-[var(--rv-surface-2)] to-[var(--rv-surface)] border border-[var(--rv-border)] flex items-center justify-center text-[var(--rv-text-muted)] font-black text-[9px] flex-shrink-0">
                    {(entry.display_name || entry.name || "?")[0].toUpperCase()}
                  </div>
                  <span className="rv-display text-sm text-white">{entry.display_name || entry.name}</span>
                </div>
                <span
                  className="font-mono text-xs font-bold"
                  style={{ color: cfg ? cfg.color : "var(--rv-text-muted)" }}
                >
                  {(entry.score || 0).toLocaleString()} XP
                </span>
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && data?.results && data.results.length > 0 && (
        <div className="rv-divider" />
      )}
      {!isLoading && (
        <p className="rv-label text-[9px] text-[var(--rv-text-dim)] text-center">
          Atualizado em tempo real via Redis
        </p>
      )}
    </div>
  );
}
