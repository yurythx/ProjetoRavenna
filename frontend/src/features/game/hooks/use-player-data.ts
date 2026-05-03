/**
 * @module usePlayerData
 *
 * Hook principal de consulta que carrega os dados completos do jogador:
 * estatísticas do personagem e inventário. É o ponto de entrada de dados
 * para a maioria dos componentes da página de jogo (`/play`).
 *
 * ## Como Usar
 * ```tsx
 * import { usePlayerData } from "@/features/game/hooks/use-player-data";
 *
 * const { data, isLoading, isError } = usePlayerData();
 *
 * if (isLoading) return <LoadingScreen />;
 * if (isError)  return <ErrorScreen />;
 *
 * const { stats, inventory } = data;
 * ```
 *
 * ## API Consumida
 * - `GET /api/v1/game-logic/`
 * - Resposta: `{ stats: PlayerStats, inventory: PlayerInventory }`
 *   - `PlayerStats`: level, experience, health, mana, strength, agility, intelligence, vitality, points_remaining, max_health, max_mana
 *   - `PlayerInventory`: gold, slots_used, max_slots, items[]
 *
 * ## Cache
 * - `queryKey`: `["player-data"]` — compartilhado entre todos os componentes.
 * - Após `useAllocatePoints.onSuccess`, o cache é atualizado via `setQueryData`
 *   sem novo fetch, mantendo `stats` sempre fresco.
 *
 * ## Observações
 * - Requer autenticação (cookie de sessão ou token Bearer).
 * - Se o jogador não tiver personagem criado, o backend retorna 404 —
 *   nesse caso redirecione para `/play?create=1`.
 * - Para forçar revalidação: `queryClient.invalidateQueries({ queryKey: ["player-data"] })`.
 */
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { PlayerInventory, PlayerStats } from "@/types";

type PlayerDataResponse = {
  inventory: PlayerInventory;
  stats: PlayerStats;
};

export const usePlayerData = () => {
  return useQuery({
    queryKey: ["player-data"],
    queryFn: async (): Promise<PlayerDataResponse> => {
      const response = await api.get("/game-logic/");
      return response.data;
    },
  });
};
