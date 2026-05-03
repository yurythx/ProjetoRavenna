import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend";
import { getAccessToken } from "@/lib/auth-cookies";

export async function GET() {
  const access = await getAccessToken();
  if (!access) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const [instancesResult, skillsResult] = await Promise.all([
    backendFetch("/api/v1/game-logic/", { method: "GET", accessToken: access }),
    backendFetch("/api/v1/game-logic/skills/", { method: "GET", accessToken: access }),
  ]);

  if (!instancesResult.ok) {
    return NextResponse.json(instancesResult.error.data, { status: instancesResult.error.status });
  }

  const skills = skillsResult.ok ? skillsResult.data : [];
  return NextResponse.json({ ...(instancesResult.data as object), skills });
}
