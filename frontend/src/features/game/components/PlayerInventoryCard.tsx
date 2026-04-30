"use client";

import { PlayerInventory } from "@/types";
import { motion } from "framer-motion";

type Props = {
  inventory: PlayerInventory;
};

export function PlayerInventoryCard({ inventory }: Props) {
  // Fill the grid with empty slots up to max_slots
  const totalSlots = Math.max(inventory.max_slots, 20);
  const slots = Array.from({ length: totalSlots }).map((_, i) => {
    return inventory.items.find((item) => item.slot_index === i);
  });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-3xl border border-white/10 bg-black/40 p-6 backdrop-blur-xl"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">Inventário</h3>
        <div className="flex items-center gap-2 rounded-full bg-yellow-500/10 px-4 py-1 border border-yellow-500/20">
          <span className="text-sm font-bold text-yellow-500">{inventory.gold.toLocaleString()}</span>
          <span className="text-xs font-bold text-yellow-600">OURO</span>
        </div>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
        {slots.map((item, i) => (
          <div
            key={i}
            className={`group relative aspect-square rounded-2xl border transition-all ${
              item 
                ? "border-purple-500/30 bg-purple-500/5 shadow-[0_0_15px_rgba(168,85,247,0.1)] hover:border-purple-500/50 hover:bg-purple-500/10" 
                : "border-white/5 bg-white/[0.02] hover:bg-white/[0.05]"
            }`}
          >
            {item && (
              <div className="flex h-full w-full flex-col items-center justify-center p-2">
                {/* Placeholder for item icon */}
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-400 to-pink-500 opacity-80 group-hover:opacity-100 transition-opacity" />
                <span className="mt-2 text-[10px] font-bold text-gray-400 truncate max-w-full">
                  {item.name}
                </span>
                {item.quantity > 1 && (
                  <span className="absolute bottom-1 right-2 text-[10px] font-black text-white">
                    x{item.quantity}
                  </span>
                )}
              </div>
            )}
            
            {!item && (
              <div className="flex h-full w-full items-center justify-center text-white/5">
                <div className="h-4 w-4 rounded-full border-2 border-current opacity-20" />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-between items-center text-[10px] font-bold tracking-widest text-gray-600 uppercase">
        <span>Capacidade</span>
        <span>{inventory.slots_used} / {inventory.max_slots}</span>
      </div>
      <div className="mt-2 h-1 w-full rounded-full bg-white/5 overflow-hidden">
        <div 
          className="h-full bg-purple-500 transition-all duration-500" 
          style={{ width: `${(inventory.slots_used / inventory.max_slots) * 100}%` }}
        />
      </div>
    </motion.div>
  );
}
