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
