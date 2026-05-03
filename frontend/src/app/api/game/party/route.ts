/**
 * @module /api/game/party
 *
 * Rota proxy Next.js para gerenciar o grupo (party) do jogador.
 * Suporta consulta, criação e saída/dissolução de grupo.
 *
 * ## Endpoints
 *
 * ### GET /api/game/party
 * Retorna o grupo atual do jogador ou `null` se não estiver em nenhum.
 * ```json
 * {
 *   "id":        "uuid",
 *   "leader_id": "uuid",
 *   "members": [
 *     { "user_id": "uuid", "display_name": "NomeJogador" }
 *   ]
 * }
 * ```
 *
 * ### POST /api/game/party
 * Cria um novo grupo com o jogador atual como líder.
 * Retorna o objeto `Party` criado com status 201.
 *
 * ### DELETE /api/game/party
 * - Se o jogador for o **líder**: dissolve o grupo para todos os membros.
 * - Se for **membro**: remove o jogador do grupo (sair).
 * Retorna `{ "ok": true }`.
 *
 * ## Erros
 * - `401 Not authenticated` — token ausente ou expirado.
 * - `400 Bad Request` — operação inválida (ex.: criar grupo já existindo).
 *
 * ## Usado por
 * - `PartyPanel` em `features/game/components/PartyPanel.tsx`
 */
import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend";
import { getAccessToken } from "@/lib/auth-cookies";

export async function GET() {
  const access = await getAccessToken();
  if (!access) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const result = await backendFetch("/api/v1/game-logic/party/", {
    method: "GET",
    accessToken: access,
  });

  if (!result.ok) {
    return NextResponse.json(result.error.data, { status: result.error.status });
  }
  return NextResponse.json(result.data);
}

export async function POST() {
  const access = await getAccessToken();
  if (!access) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const result = await backendFetch("/api/v1/game-logic/party/", {
    method: "POST",
    accessToken: access,
  });

  if (!result.ok) {
    return NextResponse.json(result.error.data, { status: result.error.status });
  }
  return NextResponse.json(result.data, { status: 201 });
}

export async function DELETE() {
  const access = await getAccessToken();
  if (!access) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const result = await backendFetch("/api/v1/game-logic/party/", {
    method: "DELETE",
    accessToken: access,
  });

  if (!result.ok) {
    return NextResponse.json(result.error.data, { status: result.error.status });
  }
  return NextResponse.json({ ok: true });
}
