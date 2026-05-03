/**
 * @module /api/game/quests
 *
 * Rota proxy Next.js que retorna as missões ativas do jogador, enriquecidas
 * com nome, objetivos e recompensas vindos dos templates de missão.
 *
 * ## Endpoint
 * `GET /api/game/quests`
 *
 * ## Resposta (200 OK)
 * ```json
 * [
 *   {
 *     "id":                 "uuid",
 *     "quest_id":           "uuid-template",
 *     "status":             "active" | "completed" | "failed",
 *     "current_objectives": { "kill_goblins": 3 },
 *     "started_at":         "2025-01-01T00:00:00Z",
 *     "completed_at":       null,
 *     "quest_name":         "Extermínio de Goblins",
 *     "quest_objectives":   [ ...QuestObjective[] ],
 *     "quest_rewards":      { "xp": 500, "gold": 100 },
 *     "quest_type":         "main" | "side"
 *   }
 * ]
 * ```
 *
 * ## Comportamento
 * - Faz duas chamadas em paralelo ao backend:
 *   1. `GET /api/v1/game-logic/quests/` — progresso das missões do jogador
 *   2. `GET /api/v1/game-logic/quest-templates/` — templates com nomes e objetivos
 * - Se templates falharem, retorna progresso sem enriquecimento (nomes = quest_id).
 *
 * ## Erros
 * - `401 Not authenticated` — token ausente ou expirado.
 *
 * ## Usado por
 * - `QuestTracker` em `features/game/components/QuestTracker.tsx`
 */
import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend";
import { getAccessToken } from "@/lib/auth-cookies";
import type { QuestTemplate, QuestObjective, QuestRewards } from "@/types";

type RawQuestProgress = {
  id: string;
  quest_id: string;
  status: string;
  current_objectives: Record<string, number>;
  started_at: string | null;
  completed_at: string | null;
};

export async function GET() {
  const access = await getAccessToken();
  if (!access) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const [progressResult, templatesResult] = await Promise.all([
    backendFetch<RawQuestProgress[]>("/api/v1/game-logic/quests/", { method: "GET", accessToken: access }),
    backendFetch<QuestTemplate[]>("/api/v1/game-logic/quest-templates/", { method: "GET", accessToken: access }),
  ]);

  if (!progressResult.ok) {
    return NextResponse.json(progressResult.error.data, { status: progressResult.error.status });
  }

  const templates = templatesResult.ok ? templatesResult.data : [];
  const templateMap = Object.fromEntries(templates.map((t) => [t.id, t]));

  const enriched = progressResult.data.map((p) => {
    const tmpl = templateMap[p.quest_id] as QuestTemplate | undefined;
    return {
      ...p,
      quest_name: tmpl?.name ?? p.quest_id,
      quest_objectives: (tmpl?.objectives ?? []) as QuestObjective[],
      quest_rewards: (tmpl?.rewards ?? {}) as QuestRewards,
      quest_type: tmpl?.quest_type ?? "side",
    };
  });

  return NextResponse.json(enriched);
}
