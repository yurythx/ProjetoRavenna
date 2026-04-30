import type { Metadata } from "next";

import { UserAdminPanel } from "@/app/dashboard/usuarios/user-admin-panel";

export const metadata: Metadata = {
  title: "Usuários | Dashboard | Projeto Ravenna",
  robots: { index: false, follow: false },
};

export default function UserAdminPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="flex items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-foreground">Usuários</h1>
          <p className="text-sm text-foreground/80">Administração de contas, grupos e acesso.</p>
        </div>
      </div>

      <div className="mt-8">
        <UserAdminPanel />
      </div>
    </div>
  );
}
