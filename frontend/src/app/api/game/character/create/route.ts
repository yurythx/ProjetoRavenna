/**
 * @module /api/game/character/create
 *
 * Rota proxy Next.js para criação do personagem do jogador. Chamada uma única
 * vez no onboarding — após a criação, o endpoint retorna 409 se o personagem
 * já existir.
 *
 * ## Endpoint
 * `POST /api/game/character/create`
 *
 * ## Corpo da Requisição
 * ```json
 * {
 *   "name":      "NomeDoPersonagem",
 *   "class_type": "warrior" | "mage" | "rogue"
 * }
 * ```
 *
 * ## Resposta (201 Created)
 * ```json
 * {
 *   "id":         "uuid",
 *   "name":       "NomeDoPersonagem",
 *   "class_type": "warrior",
 *   "level":      1,
 *   ...PlayerStats
 * }
 * ```
 *
 * ## Erros
 * - `400 Invalid JSON body` — corpo da requisição inválido ou ausente.
 * - `401 Not authenticated` — token ausente ou expirado.
 * - `409 Conflict` — personagem já criado para este usuário (propagado do backend).
 *
 * ## Usado por
 * - Formulário de criação de personagem em `/play?create=1`
 * - Componente `CharacterCreation` em `app/play/page.tsx`
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

  const result = await backendFetch("/api/v1/game-logic/character/create/", {
    method: "POST",
    json: payload,
    accessToken: access,
  });

  if (!result.ok) {
    return NextResponse.json(result.error.data, { status: result.error.status });
  }
  return NextResponse.json(result.data, { status: 201 });
}
