"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, ShieldCheck, Send, Settings2 } from "lucide-react";

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
      notify.success("Configuração salva com sucesso");
    },
    onError: (error: unknown) => notify.error("Falha ao salvar configurações", error),
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      await api.post("/api/accounts-admin/smtp-settings/test/", { to_email: testTo.trim() });
    },
    onSuccess: () => notify.success("E-mail de teste enviado com sucesso"),
    onError: (error: unknown) => notify.error("Falha ao enviar e-mail de teste", error),
  });

  return (
    <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-16 sm:py-24">
      {/* Header */}
      <div className="bg-[var(--rv-surface-2)]/30 backdrop-blur-md border border-white/5 p-8 sm:p-12 rounded-[2.5rem] relative overflow-hidden mb-12">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] rotate-12 pointer-events-none">
          <Mail className="h-64 w-64 text-white" />
        </div>
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3">
            <span className="rv-badge rv-badge-cyan">✦ Comunicações Internas</span>
          </div>
          <h1 className="rv-display text-5xl sm:text-6xl text-white tracking-tight">
            Serviço de <span className="text-[var(--rv-accent)]">E-mail</span>
          </h1>
          <p className="text-[var(--rv-text-muted)] text-sm sm:text-base max-w-2xl font-medium" style={{ fontFamily: "var(--font-body)" }}>
            Configure os parâmetros SMTP para garantir que as mensagens de sistema, verificação e recuperação cheguem aos heróis.
          </p>
        </div>
      </div>

      {isLoading || !data ? (
        <div className="rv-card p-20 text-center text-[var(--rv-text-muted)]">Aguardando resposta do servidor...</div>
      ) : (
        <div className="grid gap-10">
          {/* Main Config */}
          <div className="rv-card p-8 sm:p-10 space-y-10">
            <div className="flex items-center justify-between border-b border-white/5 pb-8">
              <div className="space-y-1">
                <h3 className="rv-display text-xl text-white">Status do Serviço</h3>
                <p className="text-xs text-[var(--rv-text-muted)]">Habilitar ou desabilitar o envio automático.</p>
              </div>
              <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                <Checkbox id="smtp-active" checked={isEnabled} onCheckedChange={(v) => setIsEnabled(Boolean(v))} />
                <label htmlFor="smtp-active" className="rv-display text-sm text-[var(--rv-accent)] cursor-pointer">
                  {isEnabled ? "Ativo" : "Inativo"}
                </label>
              </div>
            </div>

            <div className="grid gap-8 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="rv-label text-[10px] uppercase ml-1">Host SMTP</label>
                <Input value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.seudominio.com" className="rv-input h-14" />
              </div>
              <div className="space-y-2">
                <label className="rv-label text-[10px] uppercase ml-1">Porta</label>
                <Input value={String(port)} onChange={(e) => setPort(Number.parseInt(e.target.value || "0", 10) || 0)} className="rv-input h-14" />
              </div>
              <div className="space-y-2">
                <label className="rv-label text-[10px] uppercase ml-1">Usuário</label>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="usuario@dominio.com" className="rv-input h-14" />
              </div>
              <div className="space-y-2">
                <label className="rv-label text-[10px] uppercase ml-1">Senha</label>
                <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••" className="rv-input h-14" />
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
                <Checkbox id="use-tls" checked={useTls} onCheckedChange={(v) => setUseTls(Boolean(v))} />
                <label htmlFor="use-tls" className="rv-label text-xs text-white">TLS Security</label>
              </div>
              <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
                <Checkbox id="use-ssl" checked={useSsl} onCheckedChange={(v) => setUseSsl(Boolean(v))} />
                <label htmlFor="use-ssl" className="rv-label text-xs text-white">SSL Security</label>
              </div>
              <div className="space-y-2">
                <Input value={String(timeout)} onChange={(e) => setTimeout(Number.parseInt(e.target.value || "0", 10) || 0)} className="rv-input h-14" />
                <p className="text-[10px] text-center text-[var(--rv-text-dim)] uppercase">Timeout (s)</p>
              </div>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 pt-6 border-t border-white/5">
              <div className="space-y-2">
                <label className="rv-label text-[10px] uppercase ml-1">Remetente (E-mail)</label>
                <Input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="no-reply@dominio.com" className="rv-input h-14" />
              </div>
              <div className="space-y-2">
                <label className="rv-label text-[10px] uppercase ml-1">Remetente (Nome)</label>
                <Input value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Ravenna Portal" className="rv-input h-14" />
              </div>
            </div>

            <div className="flex justify-end pt-6">
              <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="rv-btn rv-btn-primary h-14 px-12 text-xs">
                {saveMutation.isPending ? "Salvando..." : "Salvar Configurações"}
              </button>
            </div>
          </div>

          {/* Test Card */}
          <div className="rv-card p-8 sm:p-10 bg-gradient-to-br from-[var(--rv-surface-2)]/20 to-transparent">
            <h3 className="rv-display text-xl text-white mb-2 flex items-center gap-3">
              <Send className="h-5 w-5 text-[var(--rv-accent)]" /> Validação de Canal
            </h3>
            <p className="text-xs text-[var(--rv-text-muted)] mb-8">Envie um e-mail de teste para garantir que as configurações estão corretas.</p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} type="email" placeholder="email@destinatario.com" className="rv-input h-14 flex-1" />
              <button 
                onClick={() => testMutation.mutate()} 
                disabled={testMutation.isPending || !testTo.trim()} 
                className="rv-btn rv-btn-secondary h-14 px-8 text-xs"
              >
                {testMutation.isPending ? "Enviando..." : "Enviar Teste"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
