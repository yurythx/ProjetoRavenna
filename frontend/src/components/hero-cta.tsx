"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

export function HeroCta() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [launching, setLaunching] = useState(false);

  const handlePlay = useCallback(() => {
    setLaunching(true);
    const clientId = crypto.randomUUID();
    router.push(`/auth/unity-callback?client_id=${clientId}`);
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
        <div className="h-12 sm:h-14 w-44 rounded-xl bg-white/5 animate-pulse" />
        <div className="h-12 sm:h-14 w-36 rounded-xl bg-white/5 animate-pulse" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
        <button
          onClick={handlePlay}
          disabled={launching}
          className="rv-btn rv-btn-primary text-xs sm:text-sm px-8 sm:px-10 h-12 sm:h-14 gap-2 w-full sm:w-auto max-w-xs disabled:opacity-60"
        >
          {launching ? (
            <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : (
            <span>⚔</span>
          )}
          {launching ? "Iniciando..." : "Entrar no Servidor"}
        </button>
        <Link
          href="/me"
          className="rv-btn rv-btn-ghost text-xs sm:text-sm px-6 sm:px-8 h-12 sm:h-14 gap-2 w-full sm:w-auto max-w-xs"
        >
          <span className="text-[var(--rv-gold)]">◆</span> Meu Herói
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
      <Link
        href="/register"
        className="rv-btn rv-btn-primary text-xs sm:text-sm px-8 sm:px-10 h-12 sm:h-14 gap-2 w-full sm:w-auto max-w-xs"
      >
        <span>⚡</span> Iniciar Jornada
      </Link>
      <Link
        href="/forum"
        className="rv-btn rv-btn-ghost text-xs sm:text-sm px-6 sm:px-8 h-12 sm:h-14 gap-2 w-full sm:w-auto max-w-xs"
      >
        <span className="text-[var(--rv-cyan)]">◈</span> Explorar Fórum
      </Link>
    </div>
  );
}
