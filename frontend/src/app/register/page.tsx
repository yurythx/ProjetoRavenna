"use client";

import { useRouter } from "next/navigation";
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
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <h1 className="text-2xl font-semibold text-foreground">Criar conta</h1>
      <p className="mt-1 text-sm text-foreground/80">Crie seu acesso para o Projeto Ravenna.</p>

      <form
        className="mt-6 flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          if (password !== passwordConfirm) {
            setError("As senhas não coincidem.");
            return;
          }
          setIsSubmitting(true);
          const result = await register({
            email,
            username,
            password,
            password_confirm: passwordConfirm,
          });
          setIsSubmitting(false);
          if (!result.ok) {
            setError("Falha ao criar conta. Verifique os dados.");
            return;
          }
          router.push(`/verify-email?email=${encodeURIComponent(email.trim())}`);
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
          <span className="text-sm font-medium text-foreground">Usuário</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            type="text"
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

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">Confirmar senha</span>
          <input
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
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
          {isSubmitting ? "Criando..." : "Criar conta"}
        </button>
      </form>
    </div>
  );
}
