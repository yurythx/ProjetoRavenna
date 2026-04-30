"use client";

import Link from "next/link";

export default function ForumError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link href="/forum" className="text-sm font-medium text-foreground hover:underline">
        Voltar
      </Link>
      <div className="mt-6 rounded-2xl border border-foreground/10 bg-background p-5 text-sm text-foreground/80">
        Ocorreu um erro ao carregar esta página.
        <div className="mt-3 flex gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-xl border border-foreground/15 bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
          >
            Tentar novamente
          </button>
          <Link href="/forum" className="self-center text-sm font-medium text-foreground hover:underline">
            Ir para o fórum
          </Link>
        </div>
      </div>
    </div>
  );
}

