/**
 * @module useAllocatePoints
 *
 * Hook de mutação para alocar pontos de atributo do personagem.
 * Realiza POST no endpoint de alocação e atualiza o cache local do
 * React Query sem necessidade de refetch completo.
 *
 * ## Como Usar
 * ```tsx
 * import { useAllocatePoints } from "@/features/game/hooks/use-allocate-points";
 *
 * const allocate = useAllocatePoints();
 *
 * // Alocar 1 ponto em força
 * allocate.mutate({ strength: 1 });
 *
 * // Alocar múltiplos atributos de uma vez (batch)
 * allocate.mutate({ strength: 2, vitality: 1 });
 * ```
 *
 * ## API Consumida
 * - `POST /api/v1/game-logic/stats/allocate/`
 * - Corpo: `{ strength?, agility?, intelligence?, vitality? }` (valores inteiros)
 * - Resposta: objeto `PlayerStats` atualizado
 *
 * ## Comportamento
 * - Em `onSuccess`, atualiza `queryClient.setQueryData(["player-data"])` localmente,
 *   substituindo `stats` sem invalidar a query (evita refetch desnecessário).
 * - `isPending` fica `true` enquanto a requisição está em andamento —
 *   use para desabilitar botões de alocação na UI.
 *
 * ## Observações
 * - O backend valida se o jogador possui pontos disponíveis; se não tiver,
 *   retorna erro 400 que o React Query propagará como `error` na mutação.
 * - Use `allocate.isError` e `allocate.error` para exibir feedback de erro.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { PlayerStats } from "@/types";

type AllocatePointsPayload = {
  strength?: number;
  agility?: number;
  intelligence?: number;
  vitality?: number;
};

export const useAllocatePoints = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AllocatePointsPayload): Promise<PlayerStats> => {
      const response = await api.post("/game-logic/stats/allocate/", payload);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["player-data"], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          stats: data,
        };
      });
    },
  });
};
