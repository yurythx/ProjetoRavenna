"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

type Step = "checking-auth" | "requesting-token" | "redirecting" | "error";

function UnityCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [step, setStep] = useState<Step>("checking-auth");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const clientId = searchParams.get("client_id");

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
        if (!res.ok) {
          throw new Error(data?.error ?? "Falha ao gerar token Unity.");
        }
        return data as { deep_link: string; token: string; expires_at: string };
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

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-foreground/10 bg-background p-8 text-center shadow-lg">
        {step === "checking-auth" && (
          <>
            <p className="text-lg font-semibold">Verificando autenticação...</p>
            <Spinner />
          </>
        )}
        {step === "requesting-token" && (
          <>
            <p className="text-lg font-semibold">Gerando token do jogo...</p>
            <Spinner />
          </>
        )}
        {step === "redirecting" && (
          <>
            <p className="text-lg font-semibold text-green-500">Abrindo o jogo...</p>
            <p className="mt-2 text-sm text-foreground/60">
              Você será redirecionado automaticamente para o Ravenna.
            </p>
          </>
        )}
        {step === "error" && (
          <>
            <p className="text-lg font-semibold text-red-500">Erro de autenticação</p>
            <p className="mt-2 text-sm text-foreground/60">{errorMsg}</p>
            <button
              onClick={() => router.push("/")}
              className="mt-4 rounded-lg bg-foreground px-4 py-2 text-sm text-background hover:opacity-90"
            >
              Voltar ao início
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function UnityCallbackPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <UnityCallbackContent />
    </Suspense>
  );
}

function Spinner() {
  return (
    <div className="mt-4 flex justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
    </div>
  );
}
