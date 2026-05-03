/**
 * @module /api/game/party/invite
 *
 * Rota proxy Next.js para convidar um jogador ao grupo do líder.
 * Apenas o líder do grupo pode enviar convites. O grupo deve existir
 * previamente (criar via `POST /api/game/party` antes de convidar).
 *
 * ## Endpoint
 * `POST /api/game/party/invite`
 *
 * ## Corpo da Requisição
 * ```json
 * { "user_id": "uuid-do-jogador-convidado" }
 * ```
 *
 * ## Resposta (200 OK)
 * Objeto `Party` atualizado com o novo membro incluído.
 *
 * ## Erros
 * - `400 user_id required` — campo `user_id` ausente no corpo.
 * - `401 Not authenticated` — token ausente ou expirado.
 * - `403 Forbidden` — jogador atual não é líder do grupo (propagado do backend).
 * - `400 Bad Request` — grupo cheio (MAX_SIZE=5) ou jogador já no grupo.
 *
 * ## Usado por
 * - `PartyPanel` em `features/game/components/PartyPanel.tsx`
 * - Formulário de convite que recebe `user_id` digitado pelo líder
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
  if (!payload?.user_id) {
    return NextResponse.json({ error: "user_id required" }, { status: 400 });
  }

  const result = await backendFetch("/api/v1/game-logic/party/invite/", {
    method: "POST",
    json: { user_id: payload.user_id },
    accessToken: access,
  });

  if (!result.ok) {
    return NextResponse.json(result.error.data, { status: result.error.status });
  }
  return NextResponse.json(result.data);
}
