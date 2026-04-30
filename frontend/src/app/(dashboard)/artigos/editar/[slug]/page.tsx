"use client"

import { useParams, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/axios"
import { Loader2 } from "lucide-react"
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

export default function EditarArtigoPage() {
  const params = useParams<{ slug: string }>()
  const router = useRouter()
  const slug = params?.slug
  const { user, isLoading: isAuthLoading } = useAuth()
  const u = (user ?? null) as Record<string, unknown> | null
  const canEdit = Boolean(u?.is_admin || u?.is_blog_editor) && !isAuthLoading

  const { data: article, isLoading, isError } = useQuery({
    queryKey: ["article", slug],
    queryFn: async () => {
      const res = await api.get(`/api/articles/articles/${slug}/`)
      return res.data
    },
    enabled: Boolean(slug),
  })

  if (isLoading || isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Carregando post...</span>
      </div>
    )
  }

  if (!canEdit) {
    return (
      <div className="rounded-2xl border border-foreground/10 bg-background p-5 text-sm text-foreground/80">
        Você não tem permissão para editar posts.
      </div>
    )
  }

  if (isError || !article) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <h2 className="text-xl font-bold">Post não encontrado</h2>
        <button
          onClick={() => router.push('/dashboard/blog')}
          className="text-primary hover:underline"
        >
          Voltar para a lista
        </button>
      </div>
    )
  }

  return (
    <ModuleGuard moduleCode="articles">
      <ArticleForm
        initialData={article}
        onSuccess={() => router.push('/dashboard/blog')}
        onCancel={() => router.push('/dashboard/blog')}
      />
    </ModuleGuard>
  )
}
