import { getApiBaseUrl } from "@/lib/env";

export type BackendError = {
  status: number;
  data: unknown;
};

export async function backendFetch<T>(
  path: string,
  init?: RequestInit & {
    json?: unknown;
    accessToken?: string | null;
    next?: { revalidate?: number; tags?: string[] };
  }
): Promise<{ ok: true; data: T } | { ok: false; error: BackendError }> {
  const baseUrl = getApiBaseUrl();
  let normalizedPath = path.startsWith("/") ? path : `/${path}`;

  // Auto-prepend /v1/ for known Django apps if missing
  const knownApps = ["accounts", "blog", "forum", "game-logic", "game-data"];
  const appMatch = normalizedPath.match(/^\/api\/(accounts|blog|forum|game-logic|game-data)\//);
  if (appMatch) {
    normalizedPath = normalizedPath.replace("/api/", "/api/v1/");
  }

  const url = `${baseUrl}${normalizedPath}`;

  const headers = new Headers(init?.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");

  if (init?.accessToken) {
    headers.set("Authorization", `Bearer ${init.accessToken}`);
  }

  let body = init?.body;
  if (init?.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers,
      body,
      cache: init?.cache ?? "no-store",
    });
  } catch (err) {
    return { ok: false, error: { status: 0, data: err instanceof Error ? err.message : String(err) } };
  }

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    return { ok: false, error: { status: res.status, data } };
  }

  return { ok: true, data: data as T };
}
