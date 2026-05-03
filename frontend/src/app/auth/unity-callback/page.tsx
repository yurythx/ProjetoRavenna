"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import Link from "next/link";

type Step = "checking-auth" | "requesting-token" | "redirecting" | "error";

const STEPS: Record<Step, { badge: string; badgeClass: string; title: string; subtitle: string }> = {
  "checking-auth": {
    badge: "Autenticando",
    badgeClass: "rv-badge-purple",
    title: "Verificando sessão",
    subtitle: "Aguarde enquanto confirmamos suas credenciais...",
  },
  "requesting-token": {
    badge: "Token",
    badgeClass: "rv-badge-cyan",
    title: "Gerando acesso",
    subtitle: "Preparando seu token de acesso ao servidor de jogo...",
  },
  "redirecting": {
    badge: "Conectado",
    badgeClass: "rv-badge-cyan",
    title: "Abrindo Ravenna",
    subtitle: "O cliente Unity será iniciado automaticamente.",
  },
  "error": {
    badge: "Erro",
    badgeClass: "rv-badge-red",
    title: "Falha no acesso",
    subtitle: "",
  },
};

function UnityCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [step, setStep] = useState<Step>("checking-auth");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const clientId = searchParams.get("client_id");
  const content = STEPS[step];

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      const next = encodeURIComponent(`/auth/unity-callback?client_id=${clientId ?? ""}`);
      router.replace(`/login?next=${next}`);
      return;
    }

    if (!clientId) {
      setStep("error");
      setErrorMsg("Parâmetro client_id ausente. Reinicie o jogo e tente novamente.");
      return;
    }

    setStep("requesting-token");

    fetch("/api/auth/unity-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Falha ao gerar token Unity.");
        return data as { deep_link: string };
      })
      .then(({ deep_link }) => {
        setStep("redirecting");
        window.location.href = deep_link;
      })
      .catch((err: Error) => {
        setStep("error");
        setErrorMsg(err.message);
      });
  }, [isLoading, user, clientId, router]);

  const isSpinning = step === "checking-auth" || step === "requesting-token";

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="rv-orb rv-animate-pulse-glow"
          style={{ width: "500px", height: "500px", top: "-20%", left: "-15%", background: "var(--rv-accent)" }}
        />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="rv-card p-10 flex flex-col items-center gap-6 text-center">

          {/* Icon */}
          <div className="relative h-16 w-16">
            {isSpinning ? (
              <>
                <div className="absolute inset-0 rounded-full border-2 border-[var(--rv-accent)] opacity-20" />
                <div className="absolute inset-0 rounded-full border-t-2 border-[var(--rv-accent)] animate-spin" />
                <div className="absolute inset-[6px] rounded-full bg-[var(--rv-accent)]/10 flex items-center justify-center">
                  <span className="text-[var(--rv-accent)] text-lg">⚔</span>
                </div>
              </>
            ) : step === "redirecting" ? (
              <>
                <div className="absolute inset-0 rounded-full bg-[var(--rv-cyan)]/15 border border-[var(--rv-cyan)]/40" />
                <div className="absolute inset-0 flex items-center justify-center text-2xl text-[var(--rv-cyan)]">✓</div>
              </>
            ) : (
              <>
                <div className="absolute inset-0 rounded-full bg-red-500/15 border border-red-500/30" />
                <div className="absolute inset-0 flex items-center justify-center text-2xl text-red-400">✗</div>
              </>
            )}
          </div>

          {/* Text */}
          <div className="flex flex-col items-center gap-2">
            <span className={`rv-badge ${content.badgeClass}`}>{content.badge}</span>
            <h1 className="rv-display text-2xl text-white">{content.title}</h1>
            <p className="text-sm text-[var(--rv-text-muted)] leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
              {step === "error" ? errorMsg : content.subtitle}
            </p>
          </div>

          {/* Error actions */}
          {step === "error" && (
            <div className="flex flex-col gap-2 w-full pt-2">
              <button
                onClick={() => router.push("/play")}
                className="rv-btn rv-btn-primary w-full h-11 text-xs"
              >
                ⚔ Tentar novamente
              </button>
              <Link href="/" className="rv-btn rv-btn-ghost w-full h-11 text-xs">
                Voltar ao início
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UnityCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-[var(--rv-accent)] border-t-transparent animate-spin" />
        </div>
      }
    >
      <UnityCallbackContent />
    </Suspense>
  );
}
