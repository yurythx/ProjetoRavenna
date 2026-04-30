"use client";

import Link from "next/link";

import { useAuth } from "@/components/auth-provider";

export function DashboardCards() {
  const { user, isLoading } = useAuth();
  const u = (user ?? null) as Record<string, unknown> | null;
  const isAdmin = Boolean(u?.is_admin) && !isLoading;
  const isForumModerator = Boolean(u?.is_forum_moderator) && !isLoading;

  return (
    <div className="mt-8 grid gap-4 md:grid-cols-2">
      <Link href="/dashboard/blog" className="rounded-2xl border border-foreground/10 bg-background p-5 hover:bg-foreground/5">
        <div className="text-base font-semibold text-foreground">Blog</div>
        <div className="mt-2 text-sm text-foreground/80">Criar, editar, revisar e publicar posts.</div>
      </Link>

      <Link href="/dashboard/blog/comentarios" className="rounded-2xl border border-foreground/10 bg-background p-5 hover:bg-foreground/5">
        <div className="text-base font-semibold text-foreground">Moderação do Blog</div>
        <div className="mt-2 text-sm text-foreground/80">Aprovar, reprovar e remover comentários do blog.</div>
      </Link>

      {isAdmin || isForumModerator ? (
        <Link href="/dashboard/forum" className="rounded-2xl border border-foreground/10 bg-background p-5 hover:bg-foreground/5">
          <div className="text-base font-semibold text-foreground">Fórum</div>
          <div className="mt-2 text-sm text-foreground/80">Ações de moderação e atalhos para tópicos.</div>
        </Link>
      ) : null}

      {isAdmin ? (
        <Link href="/dashboard/usuarios" className="rounded-2xl border border-foreground/10 bg-background p-5 hover:bg-foreground/5">
          <div className="text-base font-semibold text-foreground">Usuários</div>
          <div className="mt-2 text-sm text-foreground/80">Listar, ativar/desativar e gerenciar grupos e acesso.</div>
        </Link>
      ) : null}

      {isAdmin ? (
        <Link href="/dashboard/auditoria" className="rounded-2xl border border-foreground/10 bg-background p-5 hover:bg-foreground/5">
          <div className="text-base font-semibold text-foreground">Auditoria</div>
          <div className="mt-2 text-sm text-foreground/80">Ver histórico de ações administrativas e rastreabilidade.</div>
        </Link>
      ) : null}

      {isAdmin ? (
        <Link href="/dashboard/configuracoes/email" className="rounded-2xl border border-foreground/10 bg-background p-5 hover:bg-foreground/5">
          <div className="text-base font-semibold text-foreground">E-mail (SMTP)</div>
          <div className="mt-2 text-sm text-foreground/80">Configurar servidor SMTP e testar envio.</div>
        </Link>
      ) : null}

      {isAdmin ? (
        <Link href="/dashboard/configuracoes/diagnosticos" className="rounded-2xl border border-foreground/10 bg-background p-5 hover:bg-foreground/5">
          <div className="text-base font-semibold text-foreground">Diagnósticos</div>
          <div className="mt-2 text-sm text-foreground/80">Conferir saúde e configurações do backend.</div>
        </Link>
      ) : null}
    </div>
  );
}
