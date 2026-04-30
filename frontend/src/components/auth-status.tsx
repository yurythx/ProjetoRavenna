"use client";

import Link from "next/link";

import { useAuth } from "@/components/auth-provider";

export function AuthStatus() {
  const { user, isLoading, logout } = useAuth();

  if (isLoading) {
    return <div className="text-sm text-foreground/70">Carregando...</div>;
  }

  if (!user) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <Link href="/login" className="font-medium text-foreground hover:underline">
          Entrar
        </Link>
        <Link href="/register" className="font-medium text-foreground hover:underline">
          Criar conta
        </Link>
      </div>
    );
  }

  const u = user as Record<string, unknown>;
  const canAccessDashboard = Boolean(u?.is_admin || u?.is_blog_editor || u?.is_forum_moderator);

  return (
    <div className="flex items-center gap-3 text-sm">
      {canAccessDashboard ? (
        <Link href="/dashboard" className="font-medium text-foreground hover:underline">
          Dashboard
        </Link>
      ) : null}
      <Link href="/me" className="font-medium text-foreground hover:underline">
        Minha conta
      </Link>
      <button
        type="button"
        onClick={() => void logout()}
        className="font-medium text-foreground hover:underline"
      >
        Sair
      </button>
    </div>
  );
}
