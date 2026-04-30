"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDebounce } from "@/hooks/use-debounce";
import { api } from "@/lib/axios";

type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

type AuditUserRef = {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
};

type AdminAuditEvent = {
  id: string;
  created_at: string;
  action: string;
  actor: AuditUserRef | null;
  target: AuditUserRef;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string;
};

function parsePaginated<T>(body: unknown): Paginated<T> {
  if (Array.isArray(body)) {
    return { count: body.length, next: null, previous: null, results: body as T[] };
  }
  if (body && typeof body === "object") {
    const b = body as { count?: unknown; next?: unknown; previous?: unknown; results?: unknown };
    if (Array.isArray(b.results)) {
      return {
        count: typeof b.count === "number" ? b.count : b.results.length,
        next: typeof b.next === "string" ? b.next : null,
        previous: typeof b.previous === "string" ? b.previous : null,
        results: b.results as T[],
      };
    }
  }
  return { count: 0, next: null, previous: null, results: [] };
}

function formatWhen(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("pt-BR");
}

function formatAction(value: string): string {
  switch (value) {
    case "create_user":
      return "Criar usuário";
    case "register_user":
      return "Cadastro (signup)";
    case "email_verify_sent":
      return "Enviar verificação";
    case "email_verified":
      return "Confirmar e-mail";
    case "password_reset_sent":
      return "Enviar reset";
    case "password_reset_confirmed":
      return "Confirmar reset";
    case "activate":
      return "Ativar";
    case "deactivate":
      return "Desativar";
    case "ban":
      return "Banir";
    case "unban":
      return "Remover ban";
    case "reset_password":
      return "Resetar senha";
    case "change_groups":
      return "Trocar grupos";
    case "update_user":
      return "Atualizar usuário";
    default:
      return value;
  }
}

function formatDetails(ev: AdminAuditEvent): string {
  const md = ev.metadata;
  if (!md || typeof md !== "object") return "";
  const m = md as Record<string, unknown>;

  if (ev.action === "email_verify_sent" && typeof m.resend === "boolean") {
    return m.resend ? "Reenvio" : "Primeiro envio";
  }

  if (ev.action === "ban" && typeof m.reason === "string") {
    return `Motivo: ${m.reason}`;
  }

  if (ev.action === "change_groups") {
    const from = Array.isArray(m.from) ? m.from.filter((x) => typeof x === "string").join(", ") : "";
    const to = Array.isArray(m.to) ? m.to.filter((x) => typeof x === "string").join(", ") : "";
    if (from || to) return `Grupos: ${from || "—"} → ${to || "—"}`;
  }

  if (ev.action === "update_user" && m.changes && typeof m.changes === "object") {
    const keys = Object.keys(m.changes as Record<string, unknown>);
    if (keys.length > 0) return `Campos: ${keys.join(", ")}`;
  }

  return "";
}

export function AuditEventsPanel() {
  const { user, isLoading } = useAuth();
  const u = (user ?? null) as Record<string, unknown> | null;
  const isAdmin = Boolean(u?.is_admin) && !isLoading;

  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [q, setQ] = React.useState("");
  const debouncedQ = useDebounce(q, 400);
  const [action, setAction] = React.useState("");
  const [actorId, setActorId] = React.useState("");
  const [targetId, setTargetId] = React.useState("");
  const [ordering, setOrdering] = React.useState("-created_at");

  const queryKey = React.useMemo(
    () => ["admin-audit-events", page, pageSize, debouncedQ, action, actorId, targetId, ordering],
    [page, pageSize, debouncedQ, action, actorId, targetId, ordering]
  );

  const { data, isLoading: isDataLoading } = useQuery({
    queryKey,
    enabled: isAdmin,
    queryFn: async ({ signal }) => {
      const qs = new URLSearchParams();
      qs.set("page", String(page));
      qs.set("page_size", String(pageSize));
      if (ordering) qs.set("ordering", ordering);
      if (debouncedQ.trim()) qs.set("q", debouncedQ.trim());
      if (action.trim()) qs.set("action", action.trim());
      if (actorId.trim()) qs.set("actor", actorId.trim());
      if (targetId.trim()) qs.set("target", targetId.trim());
      const res = await api.get(`/api/accounts-admin/audit-events/?${qs.toString()}`, { signal });
      return parsePaginated<AdminAuditEvent>(res.data);
    },
  });

  const rows = data?.results ?? [];
  const canGoPrev = Boolean(data?.previous) && page > 1;
  const canGoNext = Boolean(data?.next);

  if (!isLoading && !isAdmin) {
    return (
      <div className="rounded-2xl border border-foreground/10 bg-background p-5 text-sm text-foreground/80">
        Você não tem permissão para acessar esta área.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <Input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Buscar por e-mail/usuário (ator ou alvo)..."
            className="w-full lg:w-[360px]"
          />
          <select
            value={action}
            onChange={(e) => {
              setPage(1);
              setAction(e.target.value);
            }}
            className="h-10 rounded-xl border border-foreground/15 bg-background px-3 text-sm text-foreground outline-none ring-foreground/20 focus:ring-2"
          >
            <option value="">Ação: todas</option>
            <option value="create_user">Criar usuário</option>
            <option value="register_user">Cadastro (signup)</option>
            <option value="email_verify_sent">Enviar verificação</option>
            <option value="email_verified">Confirmar e-mail</option>
            <option value="password_reset_sent">Enviar reset</option>
            <option value="password_reset_confirmed">Confirmar reset</option>
            <option value="activate">Ativar</option>
            <option value="deactivate">Desativar</option>
            <option value="ban">Banir</option>
            <option value="unban">Remover ban</option>
            <option value="reset_password">Resetar senha</option>
            <option value="change_groups">Trocar grupos</option>
            <option value="update_user">Atualizar usuário</option>
          </select>
          <Input
            value={targetId}
            onChange={(e) => {
              setPage(1);
              setTargetId(e.target.value);
            }}
            placeholder="Target ID (UUID)"
            className="w-full lg:w-[280px]"
          />
          <Input
            value={actorId}
            onChange={(e) => {
              setPage(1);
              setActorId(e.target.value);
            }}
            placeholder="Actor ID (UUID)"
            className="w-full lg:w-[280px]"
          />
          <select
            value={ordering}
            onChange={(e) => {
              setPage(1);
              setOrdering(e.target.value);
            }}
            className="h-10 rounded-xl border border-foreground/15 bg-background px-3 text-sm text-foreground outline-none ring-foreground/20 focus:ring-2"
          >
            <option value="-created_at">Ordenar: mais recentes</option>
            <option value="created_at">Ordenar: mais antigas</option>
            <option value="action">Ordenar: ação (A-Z)</option>
          </select>
        </div>

        <div className="text-sm text-foreground/70">{data ? `${rows.length} de ${data.count}` : "—"}</div>
      </div>

      <div className="rounded-2xl border border-foreground/10 bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quando</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Por</TableHead>
              <TableHead>Alvo</TableHead>
              <TableHead>Detalhes</TableHead>
              <TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isDataLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-sm text-foreground/70">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-sm text-foreground/70">
                  Nenhuma ação encontrada.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((ev) => {
                const actorLabel = ev.actor?.email ?? "Sistema";
                const targetLabel = ev.target?.email ?? "—";
                const details = formatDetails(ev);
                return (
                  <TableRow key={ev.id}>
                    <TableCell className="whitespace-nowrap text-sm">{formatWhen(ev.created_at)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{formatAction(ev.action)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-foreground/80">{actorLabel}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-foreground/80">{targetLabel}</TableCell>
                    <TableCell className="text-sm text-foreground/70">{details || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-foreground/70">{ev.ip_address || "—"}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="text-sm text-foreground/70">Página {page}</div>
        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => {
              setPage(1);
              setPageSize(Number.parseInt(e.target.value, 10));
            }}
            className="h-10 rounded-xl border border-foreground/15 bg-background px-3 text-sm text-foreground outline-none ring-foreground/20 focus:ring-2"
          >
            <option value="20">20 / página</option>
            <option value="50">50 / página</option>
            <option value="100">100 / página</option>
          </select>
          <Button type="button" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!canGoPrev}>
            Anterior
          </Button>
          <Button type="button" variant="outline" onClick={() => setPage((p) => p + 1)} disabled={!canGoNext}>
            Próxima
          </Button>
        </div>
      </div>
    </div>
  );
}
