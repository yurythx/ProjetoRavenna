"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth-provider";

export function BlogHeaderActions() {
  const { user, isLoading } = useAuth();
  const u = (user ?? null) as Record<string, unknown> | null;
  const canEdit = Boolean(u?.is_admin || u?.is_blog_editor) && !isLoading;

  if (!canEdit) return null;

  return (
    <Link href="/dashboard/blog/new" className="rv-btn rv-btn-primary text-xs px-8 h-11 gap-2">
      <span>+</span> Novo Post
    </Link>
  );
}
