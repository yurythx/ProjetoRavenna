"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/axios";
import { notify } from "@/lib/notifications";

type SMTPSettings = {
  is_enabled: boolean;
  host: string;
  port: number;
  username: string;
  password_set: boolean;
  use_tls: boolean;
  use_ssl: boolean;
  timeout: number;
  from_email: string;
  from_name: string;
  reply_to: string;
};

export default function EmailSettingsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["smtp-settings"],
    queryFn: async ({ signal }) => {
      const res = await api.get("/api/accounts-admin/smtp-settings/", { signal });
      return res.data as SMTPSettings;
    },
  });

  const [isEnabled, setIsEnabled] = React.useState(false);
  const [host, setHost] = React.useState("");
  const [port, setPort] = React.useState(587);
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [useTls, setUseTls] = React.useState(true);
  const [useSsl, setUseSsl] = React.useState(false);
  const [timeout, setTimeout] = React.useState(10);
  const [fromEmail, setFromEmail] = React.useState("");
  const [fromName, setFromName] = React.useState("");
  const [replyTo, setReplyTo] = React.useState("");
  const [testTo, setTestTo] = React.useState("");

  React.useEffect(() => {
    if (!data) return;
    setIsEnabled(Boolean(data.is_enabled));
    setHost(data.host ?? "");
    setPort(typeof data.port === "number" ? data.port : 587);
    setUsername(data.username ?? "");
    setUseTls(Boolean(data.use_tls));
    setUseSsl(Boolean(data.use_ssl));
    setTimeout(typeof data.timeout === "number" ? data.timeout : 10);
    setFromEmail(data.from_email ?? "");
    setFromName(data.from_name ?? "");
    setReplyTo(data.reply_to ?? "");
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await api.put("/api/accounts-admin/smtp-settings/", {
        is_enabled: isEnabled,
        host: host.trim(),
        port,
        username: username.trim(),
        password: password.trim().length > 0 ? password : "",
        use_tls: useTls,
        use_ssl: useSsl,
        timeout,
        from_email: fromEmail.trim(),
        from_name: fromName.trim(),
        reply_to: replyTo.trim(),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["smtp-settings"] });
      setPassword("");
      notify.success("Configuração salva");
    },
    onError: (error: unknown) => notify.error("Falha ao salvar", error),
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      await api.post("/api/accounts-admin/smtp-settings/test/", { to_email: testTo.trim() });
    },
    onSuccess: () => notify.success("E-mail de teste enviado"),
    onError: (error: unknown) => notify.error("Falha ao enviar teste", error),
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-foreground">Configuração de E-mail (SMTP)</h1>
      <p className="mt-2 text-sm text-foreground/80">Define o servidor SMTP usado para verificação de e-mail e recuperação de senha.</p>

      {isLoading || !data ? (
        <div className="mt-6 rounded-2xl border border-foreground/10 bg-background p-5 text-sm text-foreground/70">Carregando...</div>
      ) : (
        <div className="mt-6 grid gap-6">
          <div className="rounded-2xl border border-foreground/10 bg-background p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm font-medium text-foreground">Ativar SMTP</div>
              <label className="flex items-center gap-3 text-sm">
                <Checkbox checked={isEnabled} onCheckedChange={(v) => setIsEnabled(Boolean(v))} />
                <span className="text-foreground/80">{isEnabled ? "Ativo" : "Inativo"}</span>
              </label>
            </div>
            <div className="mt-3 text-xs text-foreground/60">
              Senha configurada: <span className="text-foreground">{data.password_set ? "sim" : "não"}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-foreground/10 bg-background p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-sm font-medium text-foreground">Host</div>
                <Input value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.seudominio.com" />
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium text-foreground">Porta</div>
                <Input
                  value={String(port)}
                  onChange={(e) => setPort(Number.parseInt(e.target.value || "0", 10) || 0)}
                  inputMode="numeric"
                />
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium text-foreground">Usuário</div>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="usuario@dominio.com" />
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium text-foreground">Senha</div>
                <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="(deixe vazio para manter)" />
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <label className="flex items-center gap-3 rounded-xl border border-foreground/10 p-3 text-sm">
                <Checkbox checked={useTls} onCheckedChange={(v) => setUseTls(Boolean(v))} />
                <span className="text-foreground">TLS</span>
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-foreground/10 p-3 text-sm">
                <Checkbox checked={useSsl} onCheckedChange={(v) => setUseSsl(Boolean(v))} />
                <span className="text-foreground">SSL</span>
              </label>
              <div className="grid gap-2">
                <div className="text-sm font-medium text-foreground">Timeout (s)</div>
                <Input
                  value={String(timeout)}
                  onChange={(e) => setTimeout(Number.parseInt(e.target.value || "0", 10) || 0)}
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-sm font-medium text-foreground">From e-mail</div>
                <Input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="no-reply@dominio.com" />
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium text-foreground">From nome</div>
                <Input value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Projeto Ravenna" />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <div className="text-sm font-medium text-foreground">Reply-to</div>
                <Input value={replyTo} onChange={(e) => setReplyTo(e.target.value)} placeholder="suporte@dominio.com" />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                Salvar
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-foreground/10 bg-background p-5">
            <div className="text-sm font-medium text-foreground">Enviar e-mail de teste</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
              <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} type="email" placeholder="email@dominio.com" />
              <Button
                type="button"
                variant="outline"
                disabled={testMutation.isPending || testTo.trim().length === 0}
                onClick={() => testMutation.mutate()}
              >
                Enviar teste
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

