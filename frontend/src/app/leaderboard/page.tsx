"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { useAuth } from "@/components/auth-provider";
import type { LeaderboardEntry } from "@/types";

// ── Fetch hook ─────────────────────────────────────────────────────────────────

function useLeaderboard(limit: number) {
  return useQuery({
    queryKey: ["game-logic", "leaderboard", limit],
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      const res = await api.get(`/game-logic/leaderboard/?limit=${limit}`);
      return res.data.results ?? [];
    },
    refetchInterval: 30_000,
    staleTime: 20_000,
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function scoreToLevel(score: number): number {
  return Math.floor(score / 1_000_000) || 1;
}

function scoreToXP(score: number): number {
  return score % 1_000_000;
}

function rankMedal(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function TopThreeCard({ entry }: { entry: LeaderboardEntry }) {
  const rank = entry.rank ?? 0;
  const name = entry.display_name ?? entry.name ?? "—";
  const level = scoreToLevel(entry.score);
  const xp    = scoreToXP(entry.score);
  const initial = name[0]?.toUpperCase() ?? "?";

  const glows: Record<number, string> = {
    1: "0 0 24px rgba(234,179,8,0.5)",
    2: "0 0 16px rgba(148,163,184,0.4)",
    3: "0 0 12px rgba(180,120,60,0.35)",
  };
  const gradients: Record<number, string> = {
    1: "from-yellow-500 to-amber-400",
    2: "from-slate-400 to-slate-300",
    3: "from-amber-700 to-amber-500",
  };

  return (
    <div
      className="rv-card p-6 flex flex-col items-center gap-3 text-center"
      style={{ boxShadow: glows[rank] }}
    >
      <span className="text-3xl">{rankMedal(rank)}</span>
      <div
        className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${gradients[rank] ?? "from-[var(--rv-accent)] to-[var(--rv-cyan)]"} flex items-center justify-center text-white font-black text-xl`}
      >
        {initial}
      </div>
      <div>
        <p className="rv-display text-base text-white truncate max-w-[120px]">{name}</p>
        <p className="rv-label text-[9px] text-[var(--rv-text-dim)] mt-0.5">Nível {level}</p>
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <span className="font-mono text-xs text-[var(--rv-text-muted)]">{xp.toLocaleString()} XP</span>
        <span className="rv-label text-[8px] text-[var(--rv-text-dim)]">score: {entry.score.toLocaleString()}</span>
      </div>
    </div>
  );
}

function LeaderboardRow({
  entry,
  isCurrentUser,
}: {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
}) {
  const rank  = entry.rank ?? 0;
  const name  = entry.display_name ?? entry.name ?? "—";
  const level = scoreToLevel(entry.score);
  const xp    = scoreToXP(entry.score);

  return (
    <div
      className={`flex items-center gap-4 px-5 py-3.5 rounded-xl border transition-colors ${
        isCurrentUser
          ? "border-[var(--rv-accent)]/40 bg-[var(--rv-accent-glow)]"
          : "border-[var(--rv-border)] bg-[var(--rv-surface)] hover:border-[var(--rv-border-hover)]"
      }`}
    >
      {/* Rank */}
      <span
        className={`rv-label text-xs w-8 text-center flex-shrink-0 ${
          rank <= 3 ? "text-[var(--rv-gold)]" : "text-[var(--rv-text-dim)]"
        }`}
      >
        {rankMedal(rank)}
      </span>

      {/* Avatar */}
      <div
        className={`h-9 w-9 rounded-xl flex-shrink-0 flex items-center justify-center font-black text-sm ${
          isCurrentUser
            ? "bg-gradient-to-br from-[var(--rv-accent)] to-[var(--rv-cyan)] text-white"
            : "bg-[var(--rv-surface-2)] text-[var(--rv-text-muted)]"
        }`}
      >
        {name[0]?.toUpperCase() ?? "?"}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--rv-text-primary)] truncate">
          {name}
          {isCurrentUser && (
            <span className="ml-2 rv-label text-[8px] text-[var(--rv-accent)]">você</span>
          )}
        </p>
        <p className="text-[10px] text-[var(--rv-text-dim)]">Nível {level}</p>
      </div>

      {/* XP */}
      <div className="text-right flex-shrink-0">
        <p className="font-mono text-xs text-[var(--rv-text-primary)]">{xp.toLocaleString()} XP</p>
        <p className="rv-label text-[8px] text-[var(--rv-text-dim)]">score {entry.score.toLocaleString()}</p>
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-3.5 rounded-xl border border-[var(--rv-border)] bg-[var(--rv-surface)] animate-pulse">
      <div className="h-4 w-8 rounded bg-[var(--rv-surface-2)]" />
      <div className="h-9 w-9 rounded-xl bg-[var(--rv-surface-2)]" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-1/3 rounded bg-[var(--rv-surface-2)]" />
        <div className="h-2.5 w-1/5 rounded bg-[var(--rv-surface-2)]" />
      </div>
      <div className="space-y-1.5 text-right">
        <div className="h-3 w-20 rounded bg-[var(--rv-surface-2)]" />
        <div className="h-2.5 w-16 rounded bg-[var(--rv-surface-2)]" />
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useLeaderboard(100);

  const u = (user ?? null) as Record<string, unknown> | null;
  const currentUserName = String(u?.display_name || u?.username || "");

  const topThree = data?.slice(0, 3) ?? [];
  const rest     = data?.slice(3)    ?? [];

  return (
    <div className="relative min-h-screen">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="rv-orb" style={{ width: 500, height: 500, top: "-15%", right: "-10%", background: "var(--rv-gold)", opacity: 0.04 }} />
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <span className="rv-badge rv-badge-purple mb-3 inline-flex">⚔ Ranking Global</span>
          <h1 className="rv-display text-4xl sm:text-5xl text-white">Leaderboard</h1>
          <p className="mt-2 text-sm text-[var(--rv-text-muted)]" style={{ fontFamily: "var(--font-body)" }}>
            Top {data?.length ?? "…"} heróis do servidor — atualizado a cada 30s
          </p>
        </div>

        {/* Podium (top 3) */}
        {isLoading ? (
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rv-card p-6 h-48 animate-pulse bg-[var(--rv-surface-2)]" />
            ))}
          </div>
        ) : topThree.length > 0 ? (
          <div className="grid grid-cols-3 gap-3 mb-8">
            {/* Reorder: 2nd | 1st | 3rd */}
            {[topThree[1], topThree[0], topThree[2]].map((entry) =>
              entry ? <TopThreeCard key={entry.rank} entry={entry} /> : <div key={Math.random()} />
            )}
          </div>
        ) : null}

        {/* Full list (4th onward) */}
        <div className="space-y-2">
          {isLoading
            ? Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)
            : rest.map((entry) => (
                <LeaderboardRow
                  key={entry.rank}
                  entry={entry}
                  isCurrentUser={
                    Boolean(currentUserName) &&
                    (entry.display_name === currentUserName || entry.name === currentUserName)
                  }
                />
              ))}
        </div>

        {/* Empty */}
        {!isLoading && !data?.length && (
          <div className="rv-card p-16 text-center">
            <div className="text-5xl mb-4">⚔</div>
            <h3 className="rv-display text-2xl text-white mb-2">Ranking vazio</h3>
            <p className="text-sm text-[var(--rv-text-muted)]" style={{ fontFamily: "var(--font-body)" }}>
              Nenhum jogador ainda. Seja o primeiro a entrar no servidor!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
