import { NextResponse } from "next/server";

import { getAccessToken, getRefreshToken, setAuthCookies } from "@/lib/auth-cookies";
import { backendFetch } from "@/lib/backend";

export async function GET() {
  const access = await getAccessToken();
  const refresh = await getRefreshToken();

  const me = async (token: string) =>
    backendFetch<unknown>("/api/v1/accounts/me/", {
      method: "GET",
      accessToken: token,
    });

  if (access) {
    const result = await me(access);
    if (result.ok) return NextResponse.json({ user: result.data }, { status: 200 });
  }

  if (!refresh) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const refreshed = await backendFetch<{ access: string; refresh?: string }>("/api/v1/accounts/token/refresh/", {
    method: "POST",
    json: { refresh },
  });

  if (!refreshed.ok) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  await setAuthCookies(refreshed.data.access, refreshed.data.refresh ?? refresh);

  const result = await me(refreshed.data.access);
  if (!result.ok) return NextResponse.json({ user: null }, { status: 200 });

  return NextResponse.json({ user: result.data }, { status: 200 });
}
