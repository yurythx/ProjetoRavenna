"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div className="relative flex min-h-[calc(100dvh-4rem)] sm:min-h-[calc(100dvh-5rem)] items-center justify-center px-4 py-8 sm:py-10">
      {/* Background orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="rv-orb rv-animate-pulse-glow" style={{ width: "500px", height: "500px", top: "-15%", left: "-10%", background: "var(--rv-accent)" }} />
        <div className="rv-orb" style={{ width: "300px", height: "300px", bottom: "0%", right: "-5%", background: "var(--rv-cyan)", opacity: 0.25 }} />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo mark */}
        <div className="mb-10 text-center">
          <Link href="/" className="inline-flex flex-col items-center gap-2">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[var(--rv-accent)] to-[var(--rv-cyan)] flex items-center justify-center rv-glow-purple">
              <span className="rv-display text-2xl text-white">R</span>
            </div>
            <span className="rv-label text-[9px] text-[var(--rv-text-dim)] tracking-[0.4em]">RAVENNA UNIVERSE</span>
          </Link>
        </div>

        {/* Card */}
        <div className="rv-card-glass p-6 sm:p-8 md:p-10">
          <div className="mb-8">
            <span className="rv-badge rv-badge-purple mb-4 inline-flex">✦ Acesso Restrito</span>
            <h1 className="rv-display text-2xl sm:text-3xl text-white">Entrar no Portal</h1>
            <p className="mt-2 text-sm text-[var(--rv-text-muted)]" style={{ fontFamily: "var(--font-body)" }}>
              Bem-vindo de volta, Herói. Suas conquistas aguardam.
            </p>
          </div>

          <form
            className="flex flex-col gap-5"
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              setIsSubmitting(true);
              const result = await login({ email, password });
              setIsSubmitting(false);
              if (!result.ok) {
                setError("Credenciais inválidas. Verifique e-mail e senha.");
                return;
              }
              router.push("/me");
            }}
          >
            <div>
              <label className="rv-label-field" htmlFor="email">E-mail</label>
              <input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                placeholder="heroi@ravenna.gg"
                className="rv-input"
              />
            </div>

            <div>
              <label className="rv-label-field" htmlFor="password">Senha</label>
              <input
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
                placeholder="••••••••"
                className="rv-input"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-[var(--rv-red)]/30 bg-[var(--rv-red-glow)] px-4 py-3 text-sm text-red-400">
                <span>⚠</span> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="rv-btn rv-btn-primary w-full h-13 mt-2"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Autenticando...
                </span>
              ) : (
                <span className="flex items-center gap-2"><span>⚡</span> Entrar</span>
              )}
            </button>
          </form>

          <div className="rv-divider my-6" />

          <div className="flex flex-col gap-3 text-center">
            <Link href="/forgot-password" className="rv-label text-[10px] text-[var(--rv-text-muted)] hover:text-[var(--rv-accent)] transition-colors">
              Esqueci minha senha
            </Link>
            <p className="text-sm text-[var(--rv-text-muted)]" style={{ fontFamily: "var(--font-body)" }}>
              Novo em Ravenna?{" "}
              <Link href="/register" className="text-[var(--rv-accent)] hover:underline font-semibold">
                Criar conta grátis
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
