/**
 * @module /api/game/characters
 *
 * Proxy para gerenciamento de personagens (listar e criar).
 */
import { NextResponse, NextRequest } from "next/server";
import { backendFetch } from "@/lib/backend";
import { getAccessToken } from "@/lib/auth-cookies";

export async function GET() {
  const access = await getAccessToken();
  if (!access) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const result = await backendFetch("/api/v1/game-logic/characters/", { 
    method: "GET", 
    accessToken: access 
  });

  if (!result.ok) {
    return NextResponse.json(result.error.data, { status: result.error.status });
  }
  return NextResponse.json(result.data);
}

export async function POST(req: NextRequest) {
  const access = await getAccessToken();
  if (!access) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  const result = await backendFetch("/api/v1/game-logic/characters/", { 
    method: "POST", 
    accessToken: access,
    body
  });

  if (!result.ok) {
    return NextResponse.json(result.error.data, { status: result.error.status });
  }
  return NextResponse.json(result.data, { status: 201 });
}
