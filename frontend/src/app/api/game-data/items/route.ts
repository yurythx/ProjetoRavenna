import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend";
import type { PaginatedResponse, ItemTemplate } from "@/types";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const qs = searchParams.toString();
  const path = `/api/v1/game-data/items/${qs ? `?${qs}` : ""}`;

  const result = await backendFetch<PaginatedResponse<ItemTemplate>>(path, {
    method: "GET",
    cache: "no-store",
  });

  if (!result.ok) {
    return NextResponse.json(result.error.data, { status: result.error.status });
  }
  return NextResponse.json(result.data);
}
