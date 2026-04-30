"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useDebounce } from "@/hooks/use-debounce";
import { api } from "@/lib/axios";
import { notify } from "@/lib/notifications";

type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

type UserListItem = {
  id: string;
  uuid: string;
  email: string;
  username: string;
  display_name: string | null;
  is_active: boolean;
  is_banned: boolean;
  is_verified: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  groups: string[];
  date_joined: string;
  last_login: string | null;
};

type UserDetail = UserListItem & {
  birth_date: string | null;
  gender: string | null;
  ban_reason: string | null;
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

function formatAuditWhen(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("pt-BR");
}

function formatAuditAction(value: string): string {
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

function formatAuditDetails(ev: AdminAuditEvent): string {
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

export function UserAdminPanel() {
  const queryClient = useQueryClient();
  const { user, isLoading } = useAuth();
  const u = (user ?? null) as Record<string, unknown> | null;
  const isAdmin = Boolean(u?.is_admin) && !isLoading;
  const isSuperuser = Boolean(u?.is_superuser) && !isLoading;
  const currentUserId = React.useMemo(() => {
    const v = u?.id;
    if (typeof v === "string" || typeof v === "number") return String(v);
    return null;
  }, [u]);

  const [mode, setMode] = React.useState<"all" | "banned">("all");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [staffFilter, setStaffFilter] = React.useState<"all" | "staff" | "nonstaff">("all");
  const [groupFilter, setGroupFilter] = React.useState<string>("");
  const [ordering, setOrdering] = React.useState<string>("-date_joined");

  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);

  const [banOpen, setBanOpen] = React.useState(false);
  const [banTarget, setBanTarget] = React.useState<{ id: string; email: string } | null>(null);
  const [banReason, setBanReason] = React.useState("");

  const usersQueryKey = React.useMemo(
    () => ["admin-users", mode, page, pageSize, debouncedSearch, statusFilter, staffFilter, groupFilter, ordering],
    [mode, page, pageSize, debouncedSearch, statusFilter, staffFilter, groupFilter, ordering]
  );

  const { data: usersData, isLoading: isUsersLoading } = useQuery({
    queryKey: usersQueryKey,
    enabled: isAdmin,
    queryFn: async ({ signal }) => {
      const qs = new URLSearchParams();
      qs.set("page", String(page));
      qs.set("page_size", String(pageSize));
      if (ordering) qs.set("ordering", ordering);
      if (statusFilter === "active") qs.set("is_active", "true");
      if (statusFilter === "inactive") qs.set("is_active", "false");
      if (staffFilter === "staff") qs.set("is_staff", "true");
      if (staffFilter === "nonstaff") qs.set("is_staff", "false");
      if (groupFilter.trim()) qs.set("group", groupFilter.trim());
      const path =
        debouncedSearch.trim().length > 0
          ? `/api/accounts-admin/users/search/?q=${encodeURIComponent(debouncedSearch.trim())}&${qs.toString()}`
          : mode === "banned"
            ? `/api/accounts-admin/users/banned/?${qs.toString()}`
            : `/api/accounts-admin/users/?${qs.toString()}`;
      const res = await api.get(path, { signal });
      return parsePaginated<UserListItem>(res.data);
    },
  });

  const { data: groupList } = useQuery({
    queryKey: ["admin-user-groups"],
    enabled: isAdmin,
    queryFn: async () => {
      const res = await api.get("/api/accounts-admin/users/groups/");
      const body = res.data as { results?: unknown };
      return Array.isArray(body?.results) ? (body.results as string[]) : [];
    },
  });

  const { data: selectedUser, isLoading: isSelectedUserLoading } = useQuery({
    queryKey: ["admin-user", selectedUserId],
    enabled: isAdmin && Boolean(selectedUserId) && editOpen,
    queryFn: async ({ signal }) => {
      const res = await api.get(`/api/accounts-admin/users/${selectedUserId}/`, { signal });
      return res.data as UserDetail;
    },
  });

  const { data: auditData, isLoading: isAuditLoading } = useQuery({
    queryKey: ["admin-audit-events", selectedUserId],
    enabled: isAdmin && Boolean(selectedUserId) && editOpen,
    queryFn: async ({ signal }) => {
      const qs = new URLSearchParams();
      qs.set("page", "1");
      qs.set("page_size", "10");
      qs.set("ordering", "-created_at");
      if (selectedUserId) qs.set("target", selectedUserId);
      const res = await api.get(`/api/accounts-admin/audit-events/?${qs.toString()}`, { signal });
      return parsePaginated<AdminAuditEvent>(res.data);
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/api/accounts-admin/users/${id}/activate/`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-user"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-audit-events"] });
      notify.success("Usuário ativado");
    },
    onError: (error: unknown) => notify.error("Falha ao ativar", error),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/api/accounts-admin/users/${id}/deactivate/`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-user"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-audit-events"] });
      notify.success("Usuário desativado");
    },
    onError: (error: unknown) => notify.error("Falha ao desativar", error),
  });

  const banMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await api.post(`/api/accounts-admin/users/${id}/ban/`, { reason });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-user"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-audit-events"] });
      notify.success("Usuário banido");
      setBanOpen(false);
      setBanTarget(null);
      setBanReason("");
    },
    onError: (error: unknown) => notify.error("Falha ao banir", error),
  });

  const unbanMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/api/accounts-admin/users/${id}/unban/`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-user"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-audit-events"] });
      notify.success("Ban removido");
    },
    onError: (error: unknown) => notify.error("Falha ao desbanir", error),
  });

  const updateGroupsMutation = useMutation({
    mutationFn: async ({ id, groups, isStaff }: { id: string; groups: string[]; isStaff: boolean }) => {
      await api.patch(`/api/accounts-admin/users/${id}/`, { groups, is_staff: isStaff });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-user"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-audit-events"] });
      notify.success("Usuário atualizado");
    },
    onError: (error: unknown) => notify.error("Falha ao atualizar grupos", error),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, newPassword }: { id: string; newPassword: string }) => {
      await api.post(`/api/accounts-admin/users/${id}/reset_password/`, { new_password: newPassword });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-audit-events"] });
      notify.success("Senha redefinida");
    },
    onError: (error: unknown) => notify.error("Falha ao redefinir senha", error),
  });

  const [groupsDraft, setGroupsDraft] = React.useState<string[]>([]);
  const [adminDraft, setAdminDraft] = React.useState(false);
  const [newPassword, setNewPassword] = React.useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = React.useState("");
  const [createEmail, setCreateEmail] = React.useState("");
  const [createUsername, setCreateUsername] = React.useState("");
  const [createDisplayName, setCreateDisplayName] = React.useState("");
  const [createPassword, setCreatePassword] = React.useState("");
  const [createPasswordConfirm, setCreatePasswordConfirm] = React.useState("");
  const [createIsStaff, setCreateIsStaff] = React.useState(false);
  const [createGroups, setCreateGroups] = React.useState<string[]>([]);

  const createUserMutation = useMutation({
    mutationFn: async () => {
      await api.post("/api/accounts-admin/users/", {
        email: createEmail.trim(),
        username: createUsername.trim(),
        display_name: createDisplayName.trim() || null,
        password: createPassword,
        is_staff: createIsStaff,
        groups: createGroups,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      notify.success("Usuário criado");
      setCreateOpen(false);
      setCreateEmail("");
      setCreateUsername("");
      setCreateDisplayName("");
      setCreatePassword("");
      setCreatePasswordConfirm("");
      setCreateIsStaff(false);
      setCreateGroups([]);
    },
    onError: (error: unknown) => notify.error("Falha ao criar usuário", error),
  });

  React.useEffect(() => {
    if (!selectedUser || !editOpen) return;
    setGroupsDraft(Array.isArray(selectedUser.groups) ? selectedUser.groups : []);
    setAdminDraft(Boolean(selectedUser.is_staff));
    setNewPassword("");
    setNewPasswordConfirm("");
  }, [selectedUser, editOpen]);

  const data = usersData?.results ?? [];
  const canGoPrev = Boolean(usersData?.previous) && page > 1;
  const canGoNext = Boolean(usersData?.next);

  if (!isLoading && !isAdmin) {
    return (
      <div className="rounded-2xl border border-foreground/10 bg-background p-5 text-sm text-foreground/80">
        Você não tem permissão para acessar esta área.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Buscar por e-mail, usuário ou nome..."
            className="w-full sm:w-[360px]"
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setPage(1);
              setStatusFilter(e.target.value as "all" | "active" | "inactive");
            }}
            className="h-10 rounded-xl border border-foreground/15 bg-background px-3 text-sm text-foreground outline-none ring-foreground/20 focus:ring-2"
          >
            <option value="all">Status: todos</option>
            <option value="active">Status: ativos</option>
            <option value="inactive">Status: inativos</option>
          </select>
          <select
            value={staffFilter}
            onChange={(e) => {
              setPage(1);
              setStaffFilter(e.target.value as "all" | "staff" | "nonstaff");
            }}
            className="h-10 rounded-xl border border-foreground/15 bg-background px-3 text-sm text-foreground outline-none ring-foreground/20 focus:ring-2"
          >
            <option value="all">Admin: todos</option>
            <option value="staff">Admin: sim</option>
            <option value="nonstaff">Admin: não</option>
          </select>
          <select
            value={groupFilter}
            onChange={(e) => {
              setPage(1);
              setGroupFilter(e.target.value);
            }}
            className="h-10 rounded-xl border border-foreground/15 bg-background px-3 text-sm text-foreground outline-none ring-foreground/20 focus:ring-2"
          >
            <option value="">Grupo: todos</option>
            {isSuperuser ? <option value="admins">admins</option> : null}
            {(groupList ?? []).map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <select
            value={ordering}
            onChange={(e) => {
              setPage(1);
              setOrdering(e.target.value);
            }}
            className="h-10 rounded-xl border border-foreground/15 bg-background px-3 text-sm text-foreground outline-none ring-foreground/20 focus:ring-2"
          >
            <option value="-date_joined">Ordenar: mais novos</option>
            <option value="date_joined">Ordenar: mais antigos</option>
            <option value="email">Ordenar: e-mail (A-Z)</option>
            <option value="-last_login">Ordenar: último login</option>
          </select>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === "all" ? "default" : "outline"}
              onClick={() => {
                setPage(1);
                setMode("all");
              }}
            >
              Todos
            </Button>
            <Button
              type="button"
              variant={mode === "banned" ? "default" : "outline"}
              onClick={() => {
                setPage(1);
                setMode("banned");
              }}
            >
              Banidos
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm text-foreground/70">
            {usersData ? (
              <>
                {data.length} de {usersData.count}
              </>
            ) : (
              "—"
            )}
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button type="button">Criar usuário</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Criar usuário</DialogTitle>
              </DialogHeader>

              <div className="grid gap-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <div className="text-sm font-medium text-foreground">E-mail</div>
                    <Input value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} type="email" placeholder="email@dominio.com" />
                  </div>
                  <div className="grid gap-2">
                    <div className="text-sm font-medium text-foreground">Usuário</div>
                    <Input value={createUsername} onChange={(e) => setCreateUsername(e.target.value)} placeholder="username" />
                  </div>
                </div>

                <div className="grid gap-2">
                  <div className="text-sm font-medium text-foreground">Nome de exibição</div>
                  <Input value={createDisplayName} onChange={(e) => setCreateDisplayName(e.target.value)} placeholder="Opcional" />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <div className="text-sm font-medium text-foreground">Senha</div>
                    <Input value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} type="password" />
                  </div>
                  <div className="grid gap-2">
                    <div className="text-sm font-medium text-foreground">Confirmar senha</div>
                    <Input value={createPasswordConfirm} onChange={(e) => setCreatePasswordConfirm(e.target.value)} type="password" />
                  </div>
                </div>

                <div className="grid gap-2">
                  <div className="text-sm font-medium text-foreground">Administrador</div>
                  <label className="flex items-center gap-3 rounded-xl border border-foreground/10 p-3 text-sm">
                    <Checkbox checked={createIsStaff} onCheckedChange={(next) => setCreateIsStaff(Boolean(next))} />
                    <span className="text-foreground">Acesso total (gerenciar tudo)</span>
                  </label>
                </div>

                <div className="grid gap-2">
                  <div className="text-sm font-medium text-foreground">Grupos</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(groupList ?? []).map((g) => {
                      const isChecked = createGroups.includes(g);
                      const isAdminsGroup = g === "admins";
                      const canToggle = !isAdminsGroup || isSuperuser;
                      return (
                        <label key={g} className="flex items-center gap-3 rounded-xl border border-foreground/10 p-3 text-sm">
                          <Checkbox
                            checked={isChecked}
                            disabled={!canToggle}
                            onCheckedChange={(next) => {
                              const should = Boolean(next);
                              setCreateGroups((prev) => {
                                const set = new Set(prev);
                                if (should) set.add(g);
                                else set.delete(g);
                                return Array.from(set);
                              });
                            }}
                          />
                          <span className={!canToggle ? "text-foreground/50" : "text-foreground"}>{g}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (createEmail.trim().length === 0) {
                      notify.warning("Informe o e-mail");
                      return;
                    }
                    if (createUsername.trim().length === 0) {
                      notify.warning("Informe o usuário");
                      return;
                    }
                    if (createPassword.length === 0) {
                      notify.warning("Informe a senha");
                      return;
                    }
                    if (createPassword !== createPasswordConfirm) {
                      notify.warning("Senhas não conferem");
                      return;
                    }
                    createUserMutation.mutate();
                  }}
                  disabled={createUserMutation.isPending}
                >
                  Criar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-2xl border border-foreground/10 bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>E-mail</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Grupos</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isUsersLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-sm text-foreground/70">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-sm text-foreground/70">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.email}</TableCell>
                  <TableCell>{row.username}</TableCell>
                  <TableCell className="text-sm text-foreground/70">{row.groups?.join(", ") || "—"}</TableCell>
                  <TableCell className="text-sm">
                    <div className="flex flex-col gap-1">
                      <span className={row.is_active ? "text-foreground" : "text-foreground/50"}>
                        {row.is_active ? "Ativo" : "Inativo"}
                      </span>
                      {row.is_banned ? <span className="text-red-600">Banido</span> : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog
                      open={editOpen && selectedUserId === row.id}
                      onOpenChange={(open) => {
                        setEditOpen(open);
                        if (open) setSelectedUserId(row.id);
                        if (!open) setSelectedUserId(null);
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button type="button" variant="outline" size="sm">
                          Gerenciar
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Gerenciar usuário</DialogTitle>
                        </DialogHeader>

                        {isSelectedUserLoading || !selectedUser ? (
                          <div className="text-sm text-foreground/70">Carregando...</div>
                        ) : (
                          <div className="flex flex-col gap-6">
                            <div className="grid gap-2 text-sm">
                              <div>
                                <span className="text-foreground/70">E-mail: </span>
                                <span className="font-medium text-foreground">{selectedUser.email}</span>
                              </div>
                              <div>
                                <span className="text-foreground/70">Usuário: </span>
                                <span className="font-medium text-foreground">{selectedUser.username}</span>
                              </div>
                              <div>
                                <span className="text-foreground/70">Status: </span>
                                <span className="font-medium text-foreground">
                                  {selectedUser.is_active ? "Ativo" : "Inativo"}
                                  {selectedUser.is_banned ? " · Banido" : ""}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-col gap-3">
                              <div className="text-sm font-medium text-foreground">Ações rápidas</div>
                              <div className="flex flex-wrap gap-2">
                                {selectedUser.is_active ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => deactivateMutation.mutate(selectedUser.id)}
                                    disabled={deactivateMutation.isPending || selectedUser.is_superuser}
                                  >
                                    Desativar
                                  </Button>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => activateMutation.mutate(selectedUser.id)}
                                    disabled={activateMutation.isPending}
                                  >
                                    Ativar
                                  </Button>
                                )}

                                {selectedUser.is_banned ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => unbanMutation.mutate(selectedUser.id)}
                                    disabled={unbanMutation.isPending}
                                  >
                                    Remover ban
                                  </Button>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={() => {
                                      setBanTarget({ id: selectedUser.id, email: selectedUser.email });
                                      setBanReason("");
                                      setBanOpen(true);
                                    }}
                                    disabled={banMutation.isPending || selectedUser.is_superuser}
                                  >
                                    Banir
                                  </Button>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col gap-3">
                              <div className="text-sm font-medium text-foreground">Últimas ações</div>
                              <div className="overflow-hidden rounded-xl border border-foreground/10 bg-background">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Quando</TableHead>
                                      <TableHead>Ação</TableHead>
                                      <TableHead>Por</TableHead>
                                      <TableHead>Detalhes</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {isAuditLoading ? (
                                      <TableRow>
                                        <TableCell colSpan={4} className="text-sm text-foreground/70">
                                          Carregando...
                                        </TableCell>
                                      </TableRow>
                                    ) : (auditData?.results?.length ?? 0) === 0 ? (
                                      <TableRow>
                                        <TableCell colSpan={4} className="text-sm text-foreground/70">
                                          Nenhuma ação registrada.
                                        </TableCell>
                                      </TableRow>
                                    ) : (
                                      (auditData?.results ?? []).map((ev) => {
                                        const actorLabel = ev.actor?.email ?? "Sistema";
                                        const details = formatAuditDetails(ev);
                                        return (
                                          <TableRow key={ev.id}>
                                            <TableCell className="whitespace-nowrap text-sm">{formatAuditWhen(ev.created_at)}</TableCell>
                                            <TableCell className="whitespace-nowrap text-sm">{formatAuditAction(ev.action)}</TableCell>
                                            <TableCell className="whitespace-nowrap text-sm text-foreground/80">{actorLabel}</TableCell>
                                            <TableCell className="text-sm text-foreground/70">{details || "—"}</TableCell>
                                          </TableRow>
                                        );
                                      })
                                    )}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>

                            <div className="flex flex-col gap-3">
                              <div className="text-sm font-medium text-foreground">Administrador</div>
                              <label className="flex items-center gap-3 rounded-xl border border-foreground/10 p-3 text-sm">
                                <Checkbox
                                  checked={adminDraft}
                                  disabled={
                                    Boolean(selectedUser.is_superuser) ||
                                    (currentUserId !== null && currentUserId === String(selectedUser.id))
                                  }
                                  onCheckedChange={(next) => setAdminDraft(Boolean(next))}
                                />
                                <span
                                  className={
                                    Boolean(selectedUser.is_superuser) ||
                                    (currentUserId !== null && currentUserId === String(selectedUser.id))
                                      ? "text-foreground/50"
                                      : "text-foreground"
                                  }
                                >
                                  Acesso total (gerenciar tudo)
                                </span>
                              </label>
                            </div>

                            <div className="flex flex-col gap-3">
                              <div className="text-sm font-medium text-foreground">Grupos</div>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {(groupList ?? []).map((g) => {
                                  const isChecked = groupsDraft.includes(g);
                                  const isAdminsGroup = g === "admins";
                                  const canToggle = !isAdminsGroup || isSuperuser;
                                  return (
                                    <label key={g} className="flex items-center gap-3 rounded-xl border border-foreground/10 p-3 text-sm">
                                      <Checkbox
                                        checked={isChecked}
                                        disabled={!canToggle}
                                        onCheckedChange={(next) => {
                                          const should = Boolean(next);
                                          setGroupsDraft((prev) => {
                                            const set = new Set(prev);
                                            if (should) set.add(g);
                                            else set.delete(g);
                                            return Array.from(set);
                                          });
                                        }}
                                      />
                                      <span className={!canToggle ? "text-foreground/50" : "text-foreground"}>{g}</span>
                                    </label>
                                  );
                                })}
                              </div>
                              <div className="flex justify-end">
                                <Button
                                  type="button"
                                  onClick={() =>
                                    updateGroupsMutation.mutate({
                                      id: selectedUser.id,
                                      groups: groupsDraft,
                                      isStaff: adminDraft,
                                    })
                                  }
                                  disabled={updateGroupsMutation.isPending}
                                >
                                  Salvar
                                </Button>
                              </div>
                            </div>

                            <div className="flex flex-col gap-3">
                              <div className="text-sm font-medium text-foreground">Redefinir senha</div>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <Input
                                  value={newPassword}
                                  onChange={(e) => setNewPassword(e.target.value)}
                                  type="password"
                                  placeholder="Nova senha"
                                />
                                <Input
                                  value={newPasswordConfirm}
                                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                                  type="password"
                                  placeholder="Confirmar nova senha"
                                />
                              </div>
                              <div className="flex justify-end">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => {
                                    if (newPassword.length === 0) {
                                      notify.warning("Senha vazia");
                                      return;
                                    }
                                    if (newPassword !== newPasswordConfirm) {
                                      notify.warning("Senhas não conferem");
                                      return;
                                    }
                                    resetPasswordMutation.mutate({ id: selectedUser.id, newPassword });
                                  }}
                                  disabled={resetPasswordMutation.isPending}
                                >
                                  Redefinir
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}

                        <DialogFooter />
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))
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

      <Dialog open={banOpen} onOpenChange={setBanOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Banir usuário</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="text-sm text-foreground/80">
              {banTarget ? (
                <>
                  Você está banindo <span className="font-medium">{banTarget.email}</span>.
                </>
              ) : (
                "—"
              )}
            </div>
            <div className="grid gap-2">
              <div className="text-sm font-medium text-foreground">Motivo (mín. 10 caracteres)</div>
              <Textarea value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="Descreva o motivo do banimento..." />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="destructive"
              disabled={banMutation.isPending || !banTarget}
              onClick={() => {
                const reason = banReason.trim();
                if (reason.length < 10) {
                  notify.warning("Motivo muito curto", "Informe um motivo com pelo menos 10 caracteres.");
                  return;
                }
                if (!banTarget) return;
                banMutation.mutate({ id: banTarget.id, reason });
              }}
            >
              Banir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
