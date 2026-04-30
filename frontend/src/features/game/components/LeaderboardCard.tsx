"use client";

import { useLeaderboard } from "../hooks/use-leaderboard";
import { motion } from "framer-motion";

export function LeaderboardCard() {
  const { data, isLoading } = useLeaderboard(5);

  return (
    <div className="rounded-3xl border border-white/10 bg-black/40 p-6 backdrop-blur-xl">
      <h3 className="text-xl font-bold text-white mb-6">Top Jogadores</h3>
      
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 w-full animate-pulse rounded-2xl bg-white/5" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {data?.results.map((entry, index) => (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              key={entry.name}
              className={`flex items-center justify-between rounded-2xl p-4 border ${
                index === 0 
                  ? "border-yellow-500/20 bg-yellow-500/5 shadow-[0_0_20px_rgba(234,179,8,0.05)]" 
                  : "border-white/5 bg-white/[0.02]"
              }`}
            >
              <div className="flex items-center gap-4">
                <span className={`text-sm font-black ${
                  index === 0 ? "text-yellow-500" : 
                  index === 1 ? "text-gray-300" : 
                  index === 2 ? "text-orange-600" : "text-gray-600"
                }`}>
                  #{index + 1}
                </span>
                <span className="text-sm font-bold text-white">{entry.name}</span>
              </div>
              <span className="text-sm font-mono text-gray-400">{entry.score.toLocaleString()} XP</span>
            </motion.div>
          ))}
          
          {data?.results.length === 0 && (
            <p className="text-center text-sm text-gray-500 py-4">Nenhum dado disponível.</p>
          )}
        </div>
      )}
    </div>
  );
}
