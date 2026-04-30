import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { backendFetch } from "@/lib/backend";
import { ForumHeaderActions } from "@/app/forum/forum-header-actions";

type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

type ForumCategoryDetail = {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string | null;
  topic_count: number;
  reply_count: number;
  display_order: number;
  is_active: boolean;
};

type TopicListItem = {
  id: string;
  title: string;
  slug: string;
  category: string;
  category_name: string;
  status: string;
  reply_count: number;
  view_count: number;
  is_pinned: boolean;
  is_locked: boolean;
  last_reply_at: string | null;
  created_at: string;
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const res = await backendFetch<ForumCategoryDetail>(`/api/forum/public/categories/${encodeURIComponent(slug)}/`, {
    method: "GET",
    cache: "force-cache",
    next: { revalidate: 300, tags: ["forum:categories"] },
  });
  if (!res.ok) {
    return { title: "Categoria | Fórum | Projeto Ravenna", alternates: { canonical: `/forum/c/${encodeURIComponent(slug)}` } };
  }

  const c = res.data;
  const title = `${c.name} | Fórum | Projeto Ravenna`;
  const description = c.description || "Categoria do fórum do Projeto Ravenna.";
  const canonical = `/forum/c/${encodeURIComponent(slug)}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

function parsePositiveInt(value: unknown) {
  if (typeof value !== "string") return null;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export default async function ForumCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ page?: string | string[] | undefined }>;
}) {
  const { slug } = await params;
  const sp = (await searchParams) ?? {};
  const requestedPage = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const page = parsePositiveInt(requestedPage) ?? 1;
  const pageSize = 20;

  const categoryRes = await backendFetch<ForumCategoryDetail>(`/api/forum/public/categories/${encodeURIComponent(slug)}/`, {
    method: "GET",
    cache: "force-cache",
    next: { revalidate: 300, tags: ["forum:categories"] },
  });

  if (!categoryRes.ok) {
    if (categoryRes.error.status === 404) notFound();
    throw new Error("Falha ao carregar a categoria.");
  }

  const category = categoryRes.data;

  const topicsRes = await backendFetch<Paginated<TopicListItem>>(
    `/api/forum/public/topics/?category=${encodeURIComponent(category.slug)}&page=${page}&page_size=${pageSize}`,
    { method: "GET", cache: "force-cache", next: { revalidate: 30, tags: ["forum:topics"] } }
  );
  const topics = topicsRes.ok ? topicsRes.data.results : [];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="flex items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-foreground">{category.name}</h1>
          <p className="text-sm text-foreground/80">{category.description}</p>
        </div>
        <div className="flex items-center gap-4">
          <ForumHeaderActions newTopicHref={`/forum/new?category=${category.slug}`} />
          <Link href="/forum" className="text-sm font-medium text-foreground hover:underline">
            Voltar
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-3">
        {topicsRes.ok ? null : (
          <div className="rounded-2xl border border-foreground/10 bg-background p-5 text-sm text-foreground/80">
            Não foi possível carregar os tópicos.
          </div>
        )}
        {topics.map((t) => (
          <Link
            key={t.id}
            href={`/forum/t/${t.slug}`}
            className="rounded-2xl border border-foreground/10 bg-background p-5 hover:bg-foreground/5"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="text-base font-semibold text-foreground">
                {t.is_pinned ? "[Fixado] " : ""}
                {t.title}
              </div>
              <div className="text-xs text-foreground/60">
                {t.reply_count} replies · {t.view_count} views
              </div>
            </div>
          </Link>
        ))}
        {topicsRes.ok && topics.length === 0 ? (
          <div className="rounded-2xl border border-foreground/10 bg-background p-5 text-sm text-foreground/80">
            Nenhum tópico ainda. Seja o primeiro a criar um!
          </div>
        ) : null}
      </div>

      {topicsRes.ok && topicsRes.data.count > pageSize ? (
        <div className="mt-6 flex items-center justify-between gap-4 text-sm">
          <div className="text-foreground/70">
            Página {page} de {Math.max(1, Math.ceil(topicsRes.data.count / pageSize))}
          </div>
          <div className="flex items-center gap-4">
            {topicsRes.data.previous ? (
              <Link href={`/forum/c/${category.slug}?page=${page - 1}`} className="font-medium text-foreground hover:underline">
                Anterior
              </Link>
            ) : (
              <span className="text-foreground/40">Anterior</span>
            )}
            {topicsRes.data.next ? (
              <Link href={`/forum/c/${category.slug}?page=${page + 1}`} className="font-medium text-foreground hover:underline">
                Próxima
              </Link>
            ) : (
              <span className="text-foreground/40">Próxima</span>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
