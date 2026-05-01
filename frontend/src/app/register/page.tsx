"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div className="relative flex min-h-[calc(100dvh-4rem)] sm:min-h-[calc(100dvh-5rem)] items-center justify-center px-4 py-8 sm:py-10">
      {/* Background orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="rv-orb rv-animate-pulse-glow" style={{ width: "450px", height: "450px", top: "-5%", right: "-10%", background: "var(--rv-cyan)" }} />
        <div className="rv-orb" style={{ width: "350px", height: "350px", bottom: "-10%", left: "-5%", background: "var(--rv-accent)", opacity: 0.3, animationDelay: "2s" }} />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo mark */}
        <div className="mb-10 text-center">
          <Link href="/" className="inline-flex flex-col items-center gap-2">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[var(--rv-cyan)] to-[var(--rv-accent)] flex items-center justify-center rv-glow-cyan">
              <span className="rv-display text-2xl text-white">R</span>
            </div>
            <span className="rv-label text-[9px] text-[var(--rv-text-dim)] tracking-[0.4em]">RAVENNA UNIVERSE</span>
          </Link>
        </div>

        {/* Card */}
        <div className="rv-card-glass p-6 sm:p-8 md:p-10">
          <div className="mb-8">
            <span className="rv-badge rv-badge-cyan mb-4 inline-flex">◈ Nova Conta</span>
            <h1 className="rv-display text-2xl sm:text-3xl text-white">Forje sua Lenda</h1>
            <p className="mt-2 text-sm text-[var(--rv-text-muted)]" style={{ fontFamily: "var(--font-body)" }}>
              Crie seu perfil e comece sua jornada em Ravenna.
            </p>
          </div>

          <form
            className="flex flex-col gap-5"
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              if (password !== passwordConfirm) {
                setError("As senhas não coincidem.");
                return;
              }
              setIsSubmitting(true);
              const result = await register({ email, username, password, password_confirm: passwordConfirm });
              setIsSubmitting(false);
              if (!result.ok) {
                setError("Falha ao criar conta. Verifique os dados.");
                return;
              }
              router.push(`/verify-email?email=${encodeURIComponent(email.trim())}`);
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
              <label className="rv-label-field" htmlFor="username">Nome do Herói</label>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                type="text"
                required
                placeholder="SeuNomeEpico"
                className="rv-input"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div>
                <label className="rv-label-field" htmlFor="password-confirm">Confirmar</label>
                <input
                  id="password-confirm"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  type="password"
                  required
                  placeholder="••••••••"
                  className="rv-input"
                />
              </div>
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
              style={{ background: "linear-gradient(135deg, var(--rv-cyan), var(--rv-accent))" }}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Criando seu herói...
                </span>
              ) : (
                <span className="flex items-center gap-2"><span>◈</span> Criar Conta</span>
              )}
            </button>
          </form>

          <div className="rv-divider my-6" />

          <p className="text-center text-sm text-[var(--rv-text-muted)]" style={{ fontFamily: "var(--font-body)" }}>
            Já tem uma conta?{" "}
            <Link href="/login" className="text-[var(--rv-accent)] hover:underline font-semibold">
              Entrar no Portal
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
