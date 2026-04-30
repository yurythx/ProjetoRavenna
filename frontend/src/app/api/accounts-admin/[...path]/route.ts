import { NextResponse } from "next/server";

import { getAccessToken } from "@/lib/auth-cookies";
import { getApiBaseUrl } from "@/lib/env";

async function proxy(req: Request, segments: string[]) {
  const access = await getAccessToken();
  if (!access) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const baseUrl = getApiBaseUrl().replace(/\/+$/, "");
  const url = new URL(req.url);
  const qs = url.searchParams.toString();
  const path = segments.map((s) => encodeURIComponent(s)).join("/");
  const target = `${baseUrl}/api/accounts/${path}/${qs ? `?${qs}` : ""}`;

  const headers = new Headers(req.headers);
  headers.delete("cookie");
  headers.delete("host");
  headers.set("Authorization", `Bearer ${access}`);

  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer();

  const res = await fetch(target, {
    method: req.method,
    headers,
    body,
    cache: "no-store",
  });

  const contentType = res.headers.get("content-type") ?? "application/json";
  const text = await res.text();

  return new NextResponse(text, { status: res.status, headers: { "content-type": contentType } });
}

export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxy(req, path);
}

export async function POST(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxy(req, path);
}

export async function PUT(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxy(req, path);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxy(req, path);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxy(req, path);
}
