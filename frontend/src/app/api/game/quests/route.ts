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
