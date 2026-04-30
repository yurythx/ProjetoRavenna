"use client";

import { PlayerStats } from "@/types";
import { useAllocatePoints } from "../hooks/use-allocate-points";
import { motion } from "framer-motion";

type Props = {
  stats: PlayerStats;
};

export function PlayerStatsCard({ stats }: Props) {
  const allocatePoints = useAllocatePoints();

  const handleAllocate = (attr: "strength" | "agility" | "intelligence" | "vitality") => {
    if (stats.points_remaining > 0) {
      allocatePoints.mutate({ [attr]: 1 });
    }
  };

  const statItems = [
    { label: "Força", value: stats.strength, key: "strength", color: "from-red-500 to-orange-500" },
    { label: "Agilidade", value: stats.agility, key: "agility", color: "from-green-500 to-emerald-500" },
    { label: "Inteligência", value: stats.intelligence, key: "intelligence", color: "from-blue-500 to-indigo-500" },
    { label: "Vitalidade", value: stats.vitality, key: "vitality", color: "from-yellow-500 to-amber-500" },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40 p-6 backdrop-blur-xl"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-xl font-bold text-white">Status do Personagem</h3>
          <p className="text-sm text-gray-400">Level {stats.level} — {stats.experience} XP</p>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Pontos Restantes</span>
          <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
            {stats.points_remaining}
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {statItems.map((item) => (
          <div key={item.key} className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-300">{item.label}</span>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-white">{item.value}</span>
                {stats.points_remaining > 0 && (
                  <button
                    onClick={() => handleAllocate(item.key as any)}
                    disabled={allocatePoints.isPending}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                  >
                    +
                  </button>
                )}
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((item.value / 100) * 100, 100)}%` }}
                className={`h-full rounded-full bg-gradient-to-r ${item.color}`}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white/5 p-4 border border-white/5">
          <span className="text-xs text-gray-400 block mb-1">HP</span>
          <div className="flex items-end gap-1">
            <span className="text-lg font-bold text-red-400">{stats.health}</span>
            <span className="text-xs text-gray-600 mb-1">/ {stats.max_health}</span>
          </div>
        </div>
        <div className="rounded-2xl bg-white/5 p-4 border border-white/5">
          <span className="text-xs text-gray-400 block mb-1">MP</span>
          <div className="flex items-end gap-1">
            <span className="text-lg font-bold text-blue-400">{stats.mana}</span>
            <span className="text-xs text-gray-600 mb-1">/ {stats.max_mana}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
