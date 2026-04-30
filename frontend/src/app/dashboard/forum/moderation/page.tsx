import type { Metadata } from "next";

import { ForumModerationPanel } from "@/app/dashboard/forum/moderation/forum-moderation-panel";

export const metadata: Metadata = {
  title: "Moderação do Fórum | Dashboard | Projeto Ravenna",
  robots: { index: false, follow: false },
};

export default function ForumModerationPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="flex items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-foreground">Fórum</h1>
          <p className="text-sm text-foreground/80">Acesso rápido à moderação.</p>
        </div>
      </div>

      <div className="mt-8">
        <ForumModerationPanel />
      </div>
    </div>
  );
}

