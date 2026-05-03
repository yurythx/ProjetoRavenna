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
