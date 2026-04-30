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
