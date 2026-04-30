"use client";

import { useAuth } from "@/components/auth-provider";
import { usePlayerData } from "@/features/game/hooks/use-player-data";
import { PlayerStatsCard } from "@/features/game/components/PlayerStatsCard";
import { PlayerInventoryCard } from "@/features/game/components/PlayerInventoryCard";
import { LeaderboardCard } from "@/features/game/components/LeaderboardCard";
import { motion } from "framer-motion";

export default function MePage() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: playerData, isLoading: gameLoading } = usePlayerData();

  const isLoading = authLoading || gameLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-purple-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black p-4 text-center">
        <h1 className="text-2xl font-bold text-white">Acesso Negado</h1>
        <p className="mt-2 text-gray-400">Você precisa estar logado para acessar o hub do jogador.</p>
        <a 
          href="/login" 
          className="mt-6 rounded-full bg-purple-600 px-8 py-3 font-bold text-white hover:bg-purple-700 transition-colors"
        >
          Ir para Login
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-purple-500/30">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] h-[40%] w-[40%] rounded-full bg-purple-600/10 blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] h-[40%] w-[40%] rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <span className="text-xs font-black uppercase tracking-[0.3em] text-purple-500">Player Hub</span>
            <h1 className="mt-2 text-4xl md:text-5xl font-black tracking-tight">
              Olá, <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">{user.display_name || user.username}</span>
            </h1>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex gap-4"
          >
             <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-6 py-3 backdrop-blur-md">
                <span className="block text-[10px] font-black uppercase tracking-widest text-gray-500">Membro desde</span>
                <span className="text-sm font-bold">{new Date(user.date_joined).toLocaleDateString()}</span>
             </div>
             <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-6 py-3 backdrop-blur-md">
                <span className="block text-[10px] font-black uppercase tracking-widest text-gray-500">Status</span>
                <span className="flex items-center gap-2 text-sm font-bold text-green-400">
                  <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                  Online
                </span>
             </div>
          </motion.div>
        </header>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column: Stats */}
          <div className="lg:col-span-4 space-y-8">
            {playerData && <PlayerStatsCard stats={playerData.stats} />}
            <LeaderboardCard />
          </div>

          {/* Right Column: Inventory & Recent */}
          <div className="lg:col-span-8 space-y-8">
            {playerData && <PlayerInventoryCard inventory={playerData.inventory} />}
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-3xl border border-white/10 bg-white/[0.02] p-8"
            >
              <h3 className="text-xl font-bold mb-6">Sessão Ativa</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <span className="text-xs text-gray-500 uppercase font-black tracking-widest">Endereço IP</span>
                  <p className="font-mono text-sm">{user.last_login_ip || "Desconhecido"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-gray-500 uppercase font-black tracking-widest">Dispositivo</span>
                  <p className="text-sm truncate" title={user.hwid}>{user.hwid || "Desktop Client"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-gray-500 uppercase font-black tracking-widest">Último Acesso</span>
                  <p className="text-sm">{new Date().toLocaleString()}</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
