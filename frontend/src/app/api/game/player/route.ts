/**
 * @module /api/game/player
 *
 * Rota proxy Next.js que agrega os dados completos do jogador.
 * Agora suporta múltiplos personagens via 'character_id'.
 */
import { NextResponse, NextRequest } from "next/server";
import { backendFetch } from "@/lib/backend";
import { getAccessToken } from "@/lib/auth-cookies";

export async function GET(req: NextRequest) {
  const access = await getAccessToken();
  if (!access) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const characterId = searchParams.get("character_id");

  if (!characterId) {
    return NextResponse.json({ error: "character_id is required" }, { status: 400 });
  }

  const [instancesResult, skillsResult] = await Promise.all([
    backendFetch(`/api/v1/game-logic/?character_id=${characterId}`, { method: "GET", accessToken: access }),
    backendFetch(`/api/v1/game-logic/skills/?character_id=${characterId}`, { method: "GET", accessToken: access }),
  ]);

  if (!instancesResult.ok) {
    return NextResponse.json(instancesResult.error.data, { status: instancesResult.error.status });
  }

  const skills = skillsResult.ok ? skillsResult.data : [];
  return NextResponse.json({ ...(instancesResult.data as object), skills });
}
