/**
 * @module QuestTracker
 *
 * Rastreador de missões exibido na aba "Missões" da página /play.
 * Busca as missões ativas e concluídas do jogador, exibindo progresso
 * de objetivos, recompensas e badge de tipo (Principal / Secundária etc.).
 *
 * ## Responsabilidade
 * - Buscar dados via GET /api/game/quests (auto-fetch com React Query).
 * - Separar missões em "ativas" (in_progress) e "concluídas" (completed).
 * - Exibir cada missão ativa com: nome, badge de tipo, objetivos com barra de
 *   progresso, recompensas de XP e ouro.
 * - Exibir checkbox ✓ em objetivos cujo progresso atingiu ou superou o target.
 * - Missões concluídas ficam colapsadas atrás de um toggle "Concluídas (N)".
 * - Mostrar skeleton animado durante o carregamento.
 * - Mostrar mensagem de erro quando o fetch falha.
 * - Mostrar "Nenhuma missão ativa" quando a lista está vazia.
 *
 * ## Como Usar
 * ```tsx
 * import { QuestTracker } from "@/features/game/components/QuestTracker";
 *
 * // Sem props — busca dados autonomamente via React Query
 * <QuestTracker />
 * ```
 *
 * ## API Consumida
 * - `GET /api/game/quests` — retorna QuestProgress[] já enriquecido com
 *   dados do template (nome, objetivos, recompensas, tipo).
 *   Os dados ficam em cache por 30 segundos (staleTime).
 *
 * ## Tipos Relevantes (src/types/index.ts)
 * - `QuestProgress` — inclui campos join do template: quest_name,
 *   quest_objectives, quest_rewards, quest_type.
 * - `QuestObjective` — { key, description, target_count }
 * - `QuestRewards`   — { xp?, gold?, items? }
 *
 * ## Mapeamento Visual
 * - quest_type "main"       → badge verde  "Principal"
 * - quest_type "side"       → badge roxo   "Secundária"
 * - quest_type "daily"      → badge azul   "Diária"
 * - quest_type "repeatable" → badge laranja "Repetível"
 *
 * ## Observações
 * - O componente não recebe props; gerencia seu próprio estado de fetch.
 * - O join entre QuestProgress e QuestTemplate é feito no route handler
 *   Next.js (api/game/quests/route.ts), não neste componente.
 * - Para forçar um recarregamento manual, invalide a query key ["player-quests"].
 */
"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { QuestProgress } from "@/types";

const TYPE_COLOR: Record<string, string> = {
  main:       "var(--rv-gold)",
  side:       "var(--rv-cyan)",
  daily:      "#10b981",
  repeatable: "#a855f7",
};

const TYPE_LABEL: Record<string, string> = {
  main:       "Principal",
  side:       "Secundária",
  daily:      "Diária",
  repeatable: "Repetível",
};

const STATUS_LABEL: Record<string, string> = {
  in_progress: "Em andamento",
  completed:   "Concluída",
  not_started: "Não iniciada",
  failed:      "Falhou",
};

async function fetchQuests(): Promise<QuestProgress[]> {
  const res = await fetch("/api/game/quests", { cache: "no-store" });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

function ObjectiveRow({ label, current, target }: { label: string; current: number; target: number }) {
  const pct = Math.min(100, Math.round((current / Math.max(1, target)) * 100));
  const done = current >= target;
  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <span
          className="rv-label text-[9px] flex items-center gap-1"
          style={{ color: done ? "#10b981" : "var(--rv-text-muted)" }}
        >
          {done && <span>✓</span>}
          {label}
        </span>
        <span className="rv-label text-[9px] text-[var(--rv-text-dim)]">{current}/{target}</span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--rv-surface)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: done ? "#10b981" : "var(--rv-accent)" }}
        />
      </div>
    </div>
  );
}

function QuestCard({ quest }: { quest: QuestProgress }) {
  const [open, setOpen] = useState(true);
  const typeColor = TYPE_COLOR[quest.quest_type] ?? "var(--rv-accent)";

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ borderColor: `${typeColor}33`, background: `${typeColor}07` }}
    >
      {/* Card header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <h4 className="rv-display text-sm text-white truncate">{quest.quest_name}</h4>
            <span
              className="rv-label text-[8px] px-2 py-0.5 rounded-full border flex-shrink-0"
              style={{ color: typeColor, borderColor: `${typeColor}44`, background: `${typeColor}15` }}
            >
              {TYPE_LABEL[quest.quest_type] ?? quest.quest_type}
            </span>
          </div>
          <span
            className="rv-label text-[8px]"
            style={{ color: quest.status === "completed" ? "#10b981" : "var(--rv-text-dim)" }}
          >
            {STATUS_LABEL[quest.status] ?? quest.status}
          </span>
        </div>
        <span className="text-[var(--rv-text-dim)] text-xs flex-shrink-0">{open ? "▲" : "▼"}</span>
      </button>

      {/* Objectives */}
      {open && quest.quest_objectives.length > 0 && (
        <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: `${typeColor}22` }}>
          <span className="rv-label text-[8px] text-[var(--rv-text-dim)] block pt-3">Objetivos</span>
          {quest.quest_objectives.map((obj) => (
            <ObjectiveRow
              key={obj.key}
              label={obj.description}
              current={quest.current_objectives[obj.key] ?? 0}
              target={obj.target_count}
            />
          ))}

          {/* Rewards */}
          {(quest.quest_rewards.xp || quest.quest_rewards.gold) && (
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="rv-label text-[8px] text-[var(--rv-text-dim)] mr-1">Recompensa:</span>
              {quest.quest_rewards.xp && (
                <span className="rv-label text-[8px] px-2 py-0.5 rounded-full bg-[var(--rv-accent)]/10 border border-[var(--rv-accent)]/20 text-[var(--rv-accent)]">
                  {quest.quest_rewards.xp.toLocaleString("pt-BR")} XP
                </span>
              )}
              {quest.quest_rewards.gold && (
                <span className="rv-label text-[8px] px-2 py-0.5 rounded-full bg-[var(--rv-gold)]/10 border border-[var(--rv-gold)]/20 text-[var(--rv-gold)]">
                  {quest.quest_rewards.gold.toLocaleString("pt-BR")} g
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function QuestTracker() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["player-quests"],
    queryFn: fetchQuests,
    staleTime: 30_000,
  });

  const active    = (data ?? []).filter((q) => q.status === "in_progress");
  const completed = (data ?? []).filter((q) => q.status === "completed");
  const [showCompleted, setShowCompleted] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <span className="rv-badge rv-badge-gold inline-flex">📜 Missões</span>
        {[1, 2].map((i) => (
          <div key={i} className="h-16 rounded-2xl bg-[var(--rv-surface-2)] animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <span className="rv-badge rv-badge-gold inline-flex">📜 Missões</span>
        <div className="rv-badge rv-badge-red inline-flex">Erro ao carregar missões</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <span className="rv-badge rv-badge-gold inline-flex">📜 Missões</span>

      {/* Active quests */}
      {active.length === 0 ? (
        <div className="rounded-2xl border border-[var(--rv-border)] bg-[var(--rv-surface-2)] px-5 py-8 text-center">
          <p className="text-[var(--rv-text-dim)] text-sm" style={{ fontFamily: "var(--font-body)" }}>
            Nenhuma missão ativa.<br />
            <span className="text-xs">Fale com NPCs no mapa para aceitar missões.</span>
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {active.map((q) => <QuestCard key={q.id} quest={q} />)}
        </div>
      )}

      {/* Completed quests toggle */}
      {completed.length > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowCompleted((v) => !v)}
            className="rv-label text-[9px] text-[var(--rv-text-dim)] hover:text-[var(--rv-text-muted)] transition-colors flex items-center gap-1"
          >
            {showCompleted ? "▼" : "▶"} Concluídas ({completed.length})
          </button>
          {showCompleted && (
            <div className="space-y-2 opacity-60">
              {completed.map((q) => <QuestCard key={q.id} quest={q} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
