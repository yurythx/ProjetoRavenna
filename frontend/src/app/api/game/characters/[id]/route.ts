/**
 * @module /api/game/characters/[id]
 *
 * Proxy para exclusão de um personagem específico.
 */
import { NextResponse, NextRequest } from "next/server";
import { backendFetch } from "@/lib/backend";
import { getAccessToken } from "@/lib/auth-cookies";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const access = await getAccessToken();
  if (!access) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const result = await backendFetch(`/api/v1/game-logic/characters/${params.id}/`, { 
    method: "DELETE", 
    accessToken: access 
  });

  if (!result.ok) {
    return NextResponse.json(result.error.data, { status: result.error.status });
  }
  return new NextResponse(null, { status: 204 });
}
