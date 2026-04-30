import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { getAccessToken } from "@/lib/auth-cookies";
import { getApiBaseUrl } from "@/lib/env";

async function proxy(req: Request, segments: string[]) {
  const access = await getAccessToken();
  if (!access) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const baseUrl = getApiBaseUrl().replace(/\/+$/, "");
  const url = new URL(req.url);
  const qs = url.searchParams.toString();
  const path = segments.map((s) => encodeURIComponent(s)).join("/");
  const target = `${baseUrl}/api/blog/${path}/${qs ? `?${qs}` : ""}`;

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

  const isMutation = req.method !== "GET" && req.method !== "HEAD";
  if (isMutation && res.ok) {
    const root = segments[0] ?? "";
    if (root === "posts" || root === "articles") {
      revalidateTag("blog:posts");
      const maybeSlug = segments[1];
      if (maybeSlug) revalidateTag(`blog:post:${maybeSlug}`);
    }
    if (root === "categories") {
      revalidateTag("blog:taxonomies");
      revalidateTag("blog:categories");
    }
    if (root === "tags") {
      revalidateTag("blog:taxonomies");
      revalidateTag("blog:tags");
    }
  }

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

