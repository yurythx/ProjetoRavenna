"use client";

import Link from "next/link";
import React from "react";

import { useAuth } from "@/components/auth-provider";

export function ModuleGuard({
  children,
}: {
  children: React.ReactNode;
  moduleCode?: string;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-10">
        <div className="rounded-2xl border border-foreground/10 bg-background p-5 text-sm text-foreground/70">
          Carregando...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-10">
        <div className="rounded-2xl border border-foreground/10 bg-background p-5 text-sm text-foreground/80">
          Você precisa estar logado para acessar esta área.
          <div className="mt-3 flex gap-3">
            <Link href="/login" className="text-sm font-medium text-foreground hover:underline">
              Entrar
            </Link>
            <Link href="/register" className="text-sm font-medium text-foreground hover:underline">
              Criar conta
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
