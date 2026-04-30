import { cookies } from "next/headers";

import { isProd } from "@/lib/env";

const ACCESS_COOKIE = "ravenna_access";
const REFRESH_COOKIE = "ravenna_refresh";

export async function setAuthCookies(access: string, refresh: string) {
  const jar = await cookies();
  const secure = isProd();

  jar.set(ACCESS_COOKIE, access, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
  });

  jar.set(REFRESH_COOKIE, refresh, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
  });
}

export async function clearAuthCookies() {
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
}

export async function getAccessToken() {
  const jar = await cookies();
  return jar.get(ACCESS_COOKIE)?.value ?? null;
}

export async function getRefreshToken() {
  const jar = await cookies();
  return jar.get(REFRESH_COOKIE)?.value ?? null;
}
