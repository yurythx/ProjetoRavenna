export async function jsonFetch<T = any>(
  path: string,
  init?: RequestInit & { json?: unknown }
): Promise<{ ok: boolean; status: number; data: T | null }> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (init?.json !== undefined) headers.set("Content-Type", "application/json");

  const res = await fetch(path, {
    ...init,
    headers,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data };
}
