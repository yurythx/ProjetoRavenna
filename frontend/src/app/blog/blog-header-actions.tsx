"use client";

import Link from "next/link";

import { useAuth } from "@/components/auth-provider";

export function BlogHeaderActions() {
  const { user, isLoading } = useAuth();
  const u = (user ?? null) as Record<string, unknown> | null;
  const canEdit = Boolean(u?.is_admin || u?.is_blog_editor) && !isLoading;

  if (!canEdit) return null;

  return (
    <Link
      href="/dashboard/blog/new"
      className="inline-flex h-10 items-center justify-center rounded-xl bg-foreground px-4 text-sm font-medium text-background hover:opacity-90"
    >
      Novo post
    </Link>
  );
}
