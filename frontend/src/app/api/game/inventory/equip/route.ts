/**
 * @module /api/game/inventory/equip
 *
 * Rota proxy Next.js para equipar um item do inventário. Atualiza o estado
 * de equipamento do item no backend e retorna o inventário/stats atualizados.
 *
 * ## Endpoint
 * `POST /api/game/inventory/equip`
 *
 * ## Corpo da Requisição
 * ```json
 * { "item_id": "uuid-do-item" }
 * ```
 *
 * ## Resposta (200 OK)
 * Objeto com inventário/stats atualizados conforme retorno do backend.
 *
 * ## Erros
 * - `401 Not authenticated` — token ausente ou expirado.
 * - `400 Bad Request` — item_id inválido ou item não pode ser equipado.
 * - `404 Not Found` — item não encontrado no inventário do jogador.
 *
 * ## Usado por
 * - `InventoryPanel` em `features/game/components/InventoryPanel.tsx`
 * - Após equipar, invalidar `["player-data"]` para refletir novos stats.
 */
import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend";
import { getAccessToken } from "@/lib/auth-cookies";

export async function POST(request: NextRequest) {
  const access = await getAccessToken();
  if (!access) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const result = await backendFetch("/api/v1/game-logic/inventory/equip/", {
    method: "POST",
    json: body,
    accessToken: access,
  });

  if (!result.ok) return NextResponse.json(result.error.data, { status: result.error.status });
  return NextResponse.json(result.data);
}
