import type { Metadata } from "next";

import { DashboardCards } from "@/app/dashboard/dashboard-cards";

export const metadata: Metadata = {
  title: "Dashboard | Projeto Ravenna",
  robots: { index: false, follow: false },
};

export default function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
      <p className="mt-2 text-sm text-foreground/80">Acesso rápido às áreas internas.</p>

      <DashboardCards />
    </div>
  );
}
