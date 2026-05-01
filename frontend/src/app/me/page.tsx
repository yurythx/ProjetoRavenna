"use client";

import { useAuth } from "@/components/auth-provider";
import { usePlayerData } from "@/features/game/hooks/use-player-data";
import { PlayerStatsCard } from "@/features/game/components/PlayerStatsCard";
import { PlayerInventoryCard } from "@/features/game/components/PlayerInventoryCard";
import { LeaderboardCard } from "@/features/game/components/LeaderboardCard";
import Link from "next/link";

export default function MePage() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: playerData, isLoading: gameLoading } = usePlayerData();
  const u = (user ?? null) as Record<string, unknown> | null;
  const isLoading = authLoading || gameLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100dvh-5rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 rounded-full border-2 border-[var(--rv-accent)] opacity-20" />
            <div className="absolute inset-0 rounded-full border-t-2 border-[var(--rv-accent)] animate-spin" />
            <div className="absolute inset-3 rounded-full bg-[var(--rv-accent)]/10" />
          </div>
          <span className="rv-label text-[10px] text-[var(--rv-text-dim)] tracking-[0.4em]">Carregando Herói...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[calc(100dvh-5rem)] flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="rv-badge rv-badge-red inline-flex">⚠ Acesso Negado</div>
        <h1 className="rv-display text-4xl text-white">Área Restrita</h1>
        <p className="text-[var(--rv-text-muted)] max-w-sm" style={{ fontFamily: "var(--font-body)" }}>
          Você precisa estar logado para acessar o Portal do Herói.
        </p>
        <Link href="/login" className="rv-btn rv-btn-primary px-10 h-12">
          <span>⚡</span> Entrar no Portal
        </Link>
      </div>
    );
  }

  const heroName = String(u?.display_name || u?.username || "Herói");
  const initial = heroName[0].toUpperCase();

  return (
    <div className="relative min-h-screen">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="rv-orb rv-animate-pulse-glow" style={{ width: "500px", height: "500px", top: "-15%", left: "-10%", background: "var(--rv-accent)" }} />
        <div className="rv-orb" style={{ width: "350px", height: "350px", bottom: "-5%", right: "-5%", background: "var(--rv-cyan)", opacity: 0.2, animationDelay: "2s" }} />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:py-12 sm:px-6 lg:px-8">
        {/* ── Header ── */}
        <header className="mb-8 sm:mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative h-14 w-14 sm:h-16 sm:w-16 flex-shrink-0">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[var(--rv-accent)] to-[var(--rv-cyan)] rv-glow-purple" />
              <div className="absolute inset-[2px] rounded-[14px] bg-[var(--rv-surface)] flex items-center justify-center">
                <span className="rv-display text-2xl text-[var(--rv-accent)]">{initial}</span>
              </div>
            </div>
            <div>
              <span className="rv-label text-[9px] sm:text-[10px] text-[var(--rv-accent)] tracking-[0.35em]">Player Hub</span>
              <h1 className="rv-display text-3xl sm:text-4xl md:text-5xl text-white mt-1">
                {heroName}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-3">
            <div className="rv-card px-5 py-3">
              <span className="rv-label text-[9px] text-[var(--rv-text-dim)] block">IP</span>
              <span className="font-mono text-sm text-[var(--rv-text-primary)] mt-1">
                {String(u?.last_login_ip || "—")}
              </span>
            </div>
            <div className="rv-card px-5 py-3">
              <span className="rv-label text-[9px] text-[var(--rv-text-dim)] block">Status</span>
              <span className="flex items-center gap-2 text-sm text-green-400 mt-1 font-semibold">
                <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                Online
              </span>
            </div>
            <div className="rv-card px-5 py-3">
              <span className="rv-label text-[9px] text-[var(--rv-text-dim)] block">Membro Desde</span>
              <span className="text-sm text-[var(--rv-text-primary)] mt-1">
                {new Date(String(u?.date_joined || Date.now())).toLocaleDateString("pt-BR")}
              </span>
            </div>
          </div>
        </header>

        <div className="rv-divider mb-12" />

        {/* ── Grid ── */}
        <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-12">
          {/* Left */}
          <div className="lg:col-span-4 space-y-8">
            {playerData ? (
              <PlayerStatsCard stats={playerData.stats} />
            ) : (
              <div className="rv-card p-8 text-center">
                <div className="rv-badge rv-badge-purple mb-4 inline-flex">Status</div>
                <p className="text-[var(--rv-text-muted)] text-sm" style={{ fontFamily: "var(--font-body)" }}>
                  Comece a jogar para registrar seus stats.
                </p>
              </div>
            )}
            <LeaderboardCard />
          </div>

          {/* Right */}
          <div className="lg:col-span-8 space-y-8">
            {playerData ? (
              <PlayerInventoryCard inventory={playerData.inventory} />
            ) : (
              <div className="rv-card p-12 text-center">
                <div className="text-4xl mb-4">🎒</div>
                <h3 className="rv-display text-2xl text-white mb-2">Inventário Vazio</h3>
                <p className="text-[var(--rv-text-muted)] text-sm" style={{ fontFamily: "var(--font-body)" }}>
                  Seus itens aparecerão aqui após a primeira sessão de jogo.
                </p>
              </div>
            )}

            {/* Session info */}
            <div className="rv-card p-8">
              <div className="flex items-center gap-3 mb-6">
                <span className="rv-badge rv-badge-cyan">⬡ Sessão Ativa</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                {[
                  { label: "Hardware ID", val: String(u?.hwid || "—"), mono: true },
                  { label: "Verificado", val: u?.is_verified ? "✓ Sim" : "✗ Não" },
                  { label: "Conta", val: u?.is_staff ? "🛡 Staff" : "⚔ Jogador" },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-[var(--rv-surface-2)] border border-[var(--rv-border)] p-4">
                    <span className="rv-label text-[9px] text-[var(--rv-text-dim)] block mb-2">{item.label}</span>
                    <span className={`text-sm text-[var(--rv-text-primary)] font-semibold truncate block ${item.mono ? "font-mono text-xs text-[var(--rv-cyan)]" : ""}`}>
                      {item.val}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
