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
