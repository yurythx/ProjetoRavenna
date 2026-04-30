import { NextResponse } from "next/server";

import { getAccessToken } from "@/lib/auth-cookies";
import { getApiBaseUrl } from "@/lib/env";

async function forward(req: Request, path: string) {
  const baseUrl = getApiBaseUrl().replace(/\/+$/, "");
  const access = await getAccessToken();
  if (!access) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const headers = new Headers(req.headers);
  headers.set("Authorization", `Bearer ${access}`);
  headers.delete("cookie");
  headers.delete("host");

  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer();

  const res = await fetch(`${baseUrl}${path}`, {
    method: req.method,
    headers,
    body,
    cache: "no-store",
  });

  const contentType = res.headers.get("content-type") ?? "application/json";
  const text = await res.text();
  return new NextResponse(text, { status: res.status, headers: { "content-type": contentType } });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const qs = url.searchParams.toString();
  return forward(req, `/api/blog/media/images/${qs ? `?${qs}` : ""}`);
}

export async function POST(req: Request) {
  return forward(req, "/api/blog/media/images/");
}

