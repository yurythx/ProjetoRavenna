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
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <h1 className="text-2xl font-semibold text-foreground">Entrar</h1>
      <p className="mt-1 text-sm text-foreground/80">Acesse sua conta do Projeto Ravenna.</p>
      <form
        className="mt-6 flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setIsSubmitting(true);
          const result = await login({ email, password });
          setIsSubmitting(false);
          if (!result.ok) {
            setError("Falha ao entrar. Verifique e-mail e senha.");
            return;
          }
          router.push("/me");
        }}
      >
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">E-mail</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            className="h-11 rounded-xl border border-foreground/15 bg-background px-3 text-foreground"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">Senha</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            className="h-11 rounded-xl border border-foreground/15 bg-background px-3 text-foreground"
          />
        </label>

        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="h-11 rounded-xl bg-foreground px-4 text-sm font-medium text-background disabled:opacity-60"
        >
          {isSubmitting ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <div className="mt-4 flex flex-col gap-2 text-sm">
        <Link href="/forgot-password" className="text-foreground/80 hover:text-foreground">
          Esqueci minha senha
        </Link>
        <Link href="/register" className="text-foreground/80 hover:text-foreground">
          Criar conta
        </Link>
      </div>
    </div>
  );
}
