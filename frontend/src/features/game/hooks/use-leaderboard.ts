/**
 * @module useLeaderboard
 *
 * Hook de consulta para buscar o ranking global dos jogadores.
 * Retorna os N primeiros jogadores ordenados por pontuação (XP total).
 *
 * ## Como Usar
 * ```tsx
 * import { useLeaderboard } from "@/features/game/hooks/use-leaderboard";
 *
 * // Top 5 jogadores
 * const { data, isLoading, isError } = useLeaderboard(5);
 *
 * if (isLoading) return <Skeleton />;
 * data?.results.forEach(entry => console.log(entry.name, entry.score));
 * ```
 *
 * ## API Consumida
 * - `GET /api/v1/game-logic/leaderboard/?limit=N`
 * - Resposta: `{ results: LeaderboardEntry[] }`
 *   - `LeaderboardEntry`: `{ name, display_name, score }`
 *
 * ## Parâmetros
 * - `limit` (opcional, padrão `10`) — número máximo de entradas a retornar.
 *
 * ## Cache
 * - `queryKey`: `["leaderboard", limit]` — cada valor de `limit` tem cache independente.
 * - Cache padrão do React Query (5 minutos de `staleTime`).
 *
 * ## Observações
 * - O score é baseado em XP total acumulado pelo jogador.
 * - O backend calcula o ranking via Redis, portanto reflete ações recentes.
 * - Para atualizar manualmente: `queryClient.invalidateQueries({ queryKey: ["leaderboard"] })`.
 */
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { LeaderboardEntry } from "@/types";

type LeaderboardResponse = {
  results: LeaderboardEntry[];
};

export const useLeaderboard = (limit: number = 10) => {
  return useQuery({
    queryKey: ["leaderboard", limit],
    queryFn: async (): Promise<LeaderboardResponse> => {
      const response = await api.get("/game-logic/leaderboard/", {
        params: { limit },
      });
      return response.data;
    },
  });
};
