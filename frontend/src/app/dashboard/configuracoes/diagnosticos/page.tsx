"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/axios";

type Diagnostics = Record<string, unknown>;

export default function DiagnosticsPage() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-diagnostics"],
    queryFn: async ({ signal }) => {
      const res = await api.get("/api/accounts-admin/admin/diagnostics/", { signal });
      return res.data as Diagnostics;
    },
  });

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Diagnósticos</h1>
          <p className="mt-2 text-sm text-foreground/80">Visão rápida de configurações e saúde do backend (sem expor segredos).</p>
        </div>
        <Button type="button" variant="outline" onClick={() => refetch()} disabled={isFetching}>
          Atualizar
        </Button>
      </div>

      <div className="mt-6 rounded-2xl border border-foreground/10 bg-background p-5">
        {isLoading || !data ? (
          <div className="text-sm text-foreground/70">Carregando...</div>
        ) : (
          <pre className="whitespace-pre-wrap break-words text-xs text-foreground/80">{JSON.stringify(data, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}

