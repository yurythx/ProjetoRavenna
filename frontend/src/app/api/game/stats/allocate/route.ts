/**
 * @module /api/game/stats/allocate
 *
 * Rota proxy Next.js para alocação de pontos de atributo do personagem.
 * Recebe os atributos a serem incrementados e encaminha ao backend Django.
 *
 * ## Endpoint
 * `POST /api/game/stats/allocate`
 *
 * ## Corpo da Requisição
 * ```json
 * {
 *   "strength":     1,
 *   "agility":      0,
 *   "intelligence": 2,
 *   "vitality":     0
 * }
 * ```
 * Apenas os campos com valor > 0 precisam ser enviados.
 *
 * ## Resposta (200 OK)
 * Objeto `PlayerStats` completo com os atributos atualizados e `points_remaining` decrementado.
 *
 * ## Erros
 * - `400 Invalid JSON body` — corpo ausente ou malformado.
 * - `400 Bad Request` — pontos insuficientes ou valor inválido (propagado do backend).
 * - `401 Not authenticated` — token ausente ou expirado.
 *
 * ## Usado por
 * - Hook `useAllocatePoints` em `features/game/hooks/use-allocate-points.ts`
 * - `PlayerStatsCard` (alocação individual) e `InventoryPanel` (alocação em lote)
 */
import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend";
import { getAccessToken } from "@/lib/auth-cookies";

export async function POST(req: Request) {
  const access = await getAccessToken();
  if (!access) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  if (!payload) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = await backendFetch("/api/v1/game-logic/stats/allocate/", {
    method: "POST",
    json: payload,
    accessToken: access,
  });

  if (!result.ok) {
    return NextResponse.json(result.error.data, { status: result.error.status });
  }
  return NextResponse.json(result.data);
}
