/**
 * @module /api/game/inventory/unequip
 *
 * Rota proxy Next.js para desequipar um item equipado pelo jogador.
 * O item retorna ao inventário e os stats são recalculados pelo backend.
 *
 * ## Endpoint
 * `POST /api/game/inventory/unequip`
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
 * - `400 Bad Request` — item_id inválido ou item não está equipado.
 * - `404 Not Found` — item não encontrado no personagem.
 *
 * ## Usado por
 * - `InventoryPanel` em `features/game/components/InventoryPanel.tsx`
 * - Após desequipar, invalidar `["player-data"]` para refletir stats revertidos.
 */
import { NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend";
import { getAccessToken } from "@/lib/auth-cookies";

export async function POST(request: NextRequest) {
  const access = await getAccessToken();
  if (!access) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const result = await backendFetch("/api/v1/game-logic/inventory/unequip/", {
    method: "POST",
    json: body,
    accessToken: access,
  });

  if (!result.ok) return NextResponse.json(result.error.data, { status: result.error.status });
  return NextResponse.json(result.data);
}
