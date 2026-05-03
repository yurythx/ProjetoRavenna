/**
 * @module /api/game/skills/[id]/upgrade
 *
 * Rota proxy Next.js para evoluir (upgrade) uma habilidade específica do jogador.
 * O `[id]` na URL é o UUID da habilidade (`PlayerSkill.id`).
 *
 * ## Endpoint
 * `POST /api/game/skills/{id}/upgrade`
 *
 * ## Parâmetros de Rota
 * - `id` — UUID da `PlayerSkill` que será evoluída (não o ID do template).
 *
 * ## Corpo da Requisição
 * Vazio (sem corpo necessário).
 *
 * ## Resposta (200 OK)
 * Objeto `PlayerSkill` atualizado com o novo nível e stats.
 *
 * ## Erros
 * - `401 Not authenticated` — token ausente ou expirado.
 * - `400 Bad Request` — habilidade já está no nível máximo ou sem recursos.
 * - `404 Not Found` — habilidade não encontrada.
 *
 * ## Usado por
 * - `SkillBar` em `features/game/components/SkillBar.tsx`
 * - Após upgrade, invalidar `["player-data"]` para refletir novo nível na UI.
 */
import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend";
import { getAccessToken } from "@/lib/auth-cookies";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getAccessToken();
  if (!access) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const result = await backendFetch(`/api/v1/game-logic/skills/${id}/upgrade/`, {
    method: "POST",
    json: {},
    accessToken: access,
  });

  if (!result.ok) return NextResponse.json(result.error.data, { status: result.error.status });
  return NextResponse.json(result.data);
}
