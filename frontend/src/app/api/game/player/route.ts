/**
 * @module /api/game/player
 *
 * Rota proxy Next.js que agrega os dados completos do jogador em uma única
 * requisição: estatísticas do personagem + inventário + habilidades.
 *
 * ## Endpoint
 * `GET /api/game/player`
 *
 * ## Resposta
 * ```json
 * {
 *   "stats":     { ...PlayerStats },
 *   "inventory": { ...PlayerInventory },
 *   "skills":    [ ...PlayerSkill[] ]
 * }
 * ```
 *
 * ## Comportamento
 * - Obtém o token de acesso via cookie de sessão (`getAccessToken`).
 * - Faz duas chamadas em paralelo ao backend:
 *   1. `GET /api/v1/game-logic/` — stats + inventory
 *   2. `GET /api/v1/game-logic/skills/` — lista de habilidades
 * - Se skills falhar, retorna array vazio (não interrompe a resposta).
 *
 * ## Erros
 * - `401 Not authenticated` — usuário não possui token de acesso válido.
 * - Qualquer erro do endpoint principal é propagado com o status original.
 *
 * ## Usado por
 * - Hook `usePlayerData` em `features/game/hooks/use-player-data.ts`
 * - Página `/play` para carregamento inicial
 */
import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend";
import { getAccessToken } from "@/lib/auth-cookies";

export async function GET() {
  const access = await getAccessToken();
  if (!access) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const [instancesResult, skillsResult] = await Promise.all([
    backendFetch("/api/v1/game-logic/", { method: "GET", accessToken: access }),
    backendFetch("/api/v1/game-logic/skills/", { method: "GET", accessToken: access }),
  ]);

  if (!instancesResult.ok) {
    return NextResponse.json(instancesResult.error.data, { status: instancesResult.error.status });
  }

  const skills = skillsResult.ok ? skillsResult.data : [];
  return NextResponse.json({ ...(instancesResult.data as object), skills });
}
