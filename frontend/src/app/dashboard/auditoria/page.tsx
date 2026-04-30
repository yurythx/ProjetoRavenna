import type { Metadata } from "next";

import { AuditEventsPanel } from "@/app/dashboard/auditoria/audit-events-panel";

export const metadata: Metadata = {
  title: "Auditoria | Dashboard | Projeto Ravenna",
  robots: { index: false, follow: false },
};

export default function AuditPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-foreground">Auditoria</h1>
      <p className="mt-2 text-sm text-foreground/80">Histórico de ações administrativas e eventos relevantes.</p>

      <div className="mt-6">
        <AuditEventsPanel />
      </div>
    </div>
  );
}

