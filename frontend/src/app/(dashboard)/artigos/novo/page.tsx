"use client"

import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"
import { ModuleGuard } from "@/components/module-guard"
import { useAuth } from "@/hooks/use-auth"

const ArticleForm = dynamic(
  () => import("@/features/articles/article-form").then((m) => m.ArticleForm),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-6" role="status" aria-live="polite" aria-label="Carregando editor de artigo">
        <Skeleton className="h-10 w-72 rounded-2xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-[520px] w-full rounded-2xl" />
      </div>
    ),
  }
)

export default function NovoArtigoPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const u = (user ?? null) as Record<string, unknown> | null
  const canEdit = Boolean(u?.is_admin || u?.is_blog_editor)

  return (
    <ModuleGuard moduleCode="articles">
      {isLoading ? (
        <div className="space-y-6" role="status" aria-live="polite" aria-label="Carregando permissões">
          <Skeleton className="h-10 w-72 rounded-2xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-[520px] w-full rounded-2xl" />
        </div>
      ) : canEdit ? (
        <ArticleForm onSuccess={() => router.push("/dashboard/blog")} onCancel={() => router.push("/dashboard/blog")} />
      ) : (
        <div className="rounded-2xl border border-foreground/10 bg-background p-5 text-sm text-foreground/80">
          Você não tem permissão para criar posts.
        </div>
      )}
    </ModuleGuard>
  )
}
