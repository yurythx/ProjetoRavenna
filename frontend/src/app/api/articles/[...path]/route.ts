import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { getAccessToken } from "@/lib/auth-cookies";
import { getApiBaseUrl } from "@/lib/env";

function isPublicReadPath(req: Request, segments: string[]) {
  const isRead = req.method === "GET" || req.method === "HEAD";
  if (segments[0] === "public") return isRead;
  if (!isRead) return false;

  if (segments[0] === "categories" || segments[0] === "tags") return true;

  if (segments[0] === "articles") {
    if (segments.length === 1) return true; // list
    if (segments.length === 2) return true; // detail
  }

  return false;
}

async function proxy(req: Request, segments: string[]) {
  const baseUrl = getApiBaseUrl().replace(/\/+$/, "");
  const url = new URL(req.url);
  const qs = url.searchParams.toString();
  const path = segments.map((s) => encodeURIComponent(s)).join("/");
  const target = `${baseUrl}/api/articles/${path}/${qs ? `?${qs}` : ""}`;

  const isPublic = isPublicReadPath(req, segments);
  const access = isPublic ? null : await getAccessToken();
  if (!isPublic && !access) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const headers = new Headers(req.headers);
  headers.delete("cookie");
  headers.delete("host");
  if (access) headers.set("Authorization", `Bearer ${access}`);

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
    if (root === "articles" || root === "posts") {
      revalidateTag("blog:posts");
      const maybeSlug = segments[1];
      if (maybeSlug && maybeSlug !== "analytics") {
        revalidateTag(`blog:post:${maybeSlug}`);
      }
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
