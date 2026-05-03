"use client";

import React, { useState, useTransition } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Party } from "@/types";

const MAX_PARTY_SIZE = 5;

async function fetchParty(): Promise<Party | null> {
  const res = await fetch("/api/game/party");
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

export function PartyPanel({ userId }: { userId: string }) {
  const { data: party, isLoading, refetch } = useQuery<Party | null>({
    queryKey: ["party"],
    queryFn: fetchParty,
    staleTime: 15_000,
  });

  const [inviteId, setInviteId] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [actionError, setActionError] = useState("");
  const [isPending, startTransition] = useTransition();

  function refresh() {
    setActionError("");
    refetch();
  }

  function createParty() {
    setActionError("");
    startTransition(async () => {
      const res = await fetch("/api/game/party", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setActionError(data?.error ?? "Erro ao criar grupo.");
      } else {
        refresh();
      }
    });
  }

  function leaveParty() {
    setActionError("");
    startTransition(async () => {
      const res = await fetch("/api/game/party", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setActionError(data?.error ?? "Erro ao sair do grupo.");
      } else {
        refresh();
      }
    });
  }

  function invite() {
    const id = inviteId.trim();
    if (!id) return;
    setInviteError("");
    startTransition(async () => {
      const res = await fetch("/api/game/party/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setInviteError(data?.error ?? "Erro ao convidar jogador.");
      } else {
        setInviteId("");
        refresh();
      }
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-xl bg-[var(--rv-surface-2)]" />
        ))}
      </div>
    );
  }

  const isLeader = party?.leader_id === userId;
  const memberCount = party?.members.length ?? 0;

  return (
    <div className="space-y-5">
      <span className="rv-badge rv-badge-purple inline-flex">⚔ Grupo de Aventura</span>

      {!party ? (
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <div className="h-14 w-14 rounded-2xl border border-[var(--rv-border)] bg-[var(--rv-surface-2)] flex items-center justify-center text-2xl">
            ⚔
          </div>
          <p className="text-sm text-[var(--rv-text-muted)] max-w-xs" style={{ fontFamily: "var(--font-body)" }}>
            Você não está em nenhum grupo. Crie um para aventurar em equipe e compartilhar XP.
          </p>
          {actionError && (
            <span className="rv-label text-[9px] text-red-400">{actionError}</span>
          )}
          <button
            type="button"
            onClick={createParty}
            disabled={isPending}
            className="rv-btn rv-btn-primary px-8 h-10 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full border-t-2 border-white animate-spin" />
                Criando...
              </span>
            ) : "⚔ Criar Grupo"}
          </button>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="rv-label text-[9px] px-2.5 py-1 rounded-full"
                style={{
                  background: "var(--rv-accent)/10",
                  border: "1px solid var(--rv-accent)/20",
                  color: "var(--rv-accent)",
                }}
              >
                {memberCount}/{MAX_PARTY_SIZE} membros
              </span>
              {isLeader && (
                <span className="rv-label text-[8px] px-2 py-0.5 rounded-full bg-[var(--rv-gold)]/10 border border-[var(--rv-gold)]/25 text-[var(--rv-gold)]">
                  Você é o líder
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={leaveParty}
              disabled={isPending}
              className="rv-label text-[9px] px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              {isLeader ? "Dissolver grupo" : "Sair do grupo"}
            </button>
          </div>

          {actionError && (
            <span className="rv-label text-[9px] text-red-400">{actionError}</span>
          )}

          {/* Member list */}
          <div className="space-y-2">
            {party.members.map((m) => {
              const isCurrentUser = m.user_id === userId;
              const isMemberLeader = m.user_id === party.leader_id;
              return (
                <div
                  key={m.user_id}
                  className="flex items-center gap-3 rounded-xl bg-[var(--rv-surface-2)] border px-4 py-3 transition-colors"
                  style={{
                    borderColor: isCurrentUser ? "var(--rv-accent)/30" : "var(--rv-border)",
                    background: isCurrentUser ? "var(--rv-accent)/4" : undefined,
                  }}
                >
                  <div
                    className="h-9 w-9 rounded-xl flex-shrink-0 flex items-center justify-center border font-bold text-sm"
                    style={{
                      background: isMemberLeader ? "var(--rv-gold)/15" : "var(--rv-accent)/10",
                      borderColor: isMemberLeader ? "var(--rv-gold)/30" : "var(--rv-accent)/20",
                      color: isMemberLeader ? "var(--rv-gold)" : "var(--rv-accent)",
                    }}
                  >
                    {m.display_name.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <span
                      className="text-sm font-semibold text-[var(--rv-text-primary)] block truncate"
                      style={{ fontFamily: "var(--font-body)" }}
                    >
                      {m.display_name}
                      {isCurrentUser && (
                        <span className="ml-1.5 rv-label text-[8px] text-[var(--rv-text-dim)]">(você)</span>
                      )}
                    </span>
                  </div>

                  {isMemberLeader && (
                    <span className="rv-label text-[8px] px-2 py-0.5 rounded-full bg-[var(--rv-gold)]/10 border border-[var(--rv-gold)]/25 text-[var(--rv-gold)] flex-shrink-0">
                      Líder
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Invite section — only leader can invite, only if not full */}
          {isLeader && memberCount < MAX_PARTY_SIZE && (
            <div className="space-y-2 pt-1">
              <span className="rv-label text-[9px] text-[var(--rv-text-dim)] tracking-[0.3em] block">
                CONVIDAR JOGADOR
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inviteId}
                  onChange={(e) => setInviteId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && invite()}
                  placeholder="ID do jogador..."
                  className="flex-1 h-9 rounded-lg bg-[var(--rv-surface-2)] border border-[var(--rv-border)] px-3 text-sm text-[var(--rv-text-primary)] placeholder:text-[var(--rv-text-dim)] focus:outline-none focus:border-[var(--rv-accent)] transition-colors"
                />
                <button
                  type="button"
                  onClick={invite}
                  disabled={isPending || !inviteId.trim()}
                  className="rv-btn rv-btn-primary h-9 px-4 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Convidar
                </button>
              </div>
              {inviteError && (
                <span className="rv-label text-[9px] text-red-400 block">{inviteError}</span>
              )}
              <p className="rv-label text-[8px] text-[var(--rv-text-dim)]">
                Use o ID único do jogador. O jogador deve estar registrado no Ravenna.
              </p>
            </div>
          )}

          {isLeader && memberCount >= MAX_PARTY_SIZE && (
            <p className="rv-label text-[9px] text-[var(--rv-text-dim)] text-center py-2">
              Grupo completo — {MAX_PARTY_SIZE}/{MAX_PARTY_SIZE} membros.
            </p>
          )}
        </>
      )}
    </div>
  );
}
