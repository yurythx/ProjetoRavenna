import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { backendFetch } from "@/lib/backend";
import { ForumHeaderActions } from "@/app/forum/forum-header-actions";

type Paginated<T> = { count: number; next: string | null; previous: string | null; results: T[] };

type ForumCategoryDetail = {
  id: string; name: string; slug: string; description: string;
  icon: string | null; topic_count: number; reply_count: number;
  display_order: number; is_active: boolean;
};

type TopicListItem = {
  id: string; title: string; slug: string;
  category: string; category_name: string; status: string;
  reply_count: number; view_count: number;
  is_pinned: boolean; is_locked: boolean;
  last_reply_at: string | null; created_at: string;
  author_name?: string;
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const res = await backendFetch<ForumCategoryDetail>(`/api/v1/forum/public/categories/${encodeURIComponent(slug)}/`, {
    method: "GET", cache: "force-cache", next: { revalidate: 300 },
  });
  if (!res.ok) return { title: "Categoria | Fórum | RAVENNA" };
  return {
    title: `${res.data.name} | Fórum | RAVENNA`,
    description: res.data.description || "Categoria do fórum Ravenna.",
    alternates: { canonical: `/forum/c/${slug}` },
  };
}

function parsePositiveInt(v: unknown) {
  if (typeof v !== "string") return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default async function ForumCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ page?: string | string[] }>;
}) {
  const { slug } = await params;
  const sp = (await searchParams) ?? {};
  const rawPage = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const page = parsePositiveInt(rawPage) ?? 1;
  const pageSize = 20;

  // Try v1 endpoint, fall back to legacy
  let categoryRes = await backendFetch<ForumCategoryDetail>(
    `/api/v1/forum/public/categories/${encodeURIComponent(slug)}/`,
    { method: "GET", cache: "force-cache", next: { revalidate: 300 } }
  );
  if (!categoryRes.ok) {
    categoryRes = await backendFetch<ForumCategoryDetail>(
      `/api/forum/public/categories/${encodeURIComponent(slug)}/`,
      { method: "GET", cache: "force-cache", next: { revalidate: 300 } }
    );
  }

  if (!categoryRes.ok) {
    if ("error" in categoryRes && categoryRes.error.status === 404) notFound();
    throw new Error("Falha ao carregar a categoria.");
  }

  const category = categoryRes.data;

  let topicsRes = await backendFetch<Paginated<TopicListItem>>(
    `/api/v1/forum/public/topics/?category=${encodeURIComponent(category.slug)}&page=${page}&page_size=${pageSize}`,
    { method: "GET", cache: "force-cache", next: { revalidate: 30 } }
  );
  if (!topicsRes.ok) {
    topicsRes = await backendFetch<Paginated<TopicListItem>>(
      `/api/forum/public/topics/?category=${encodeURIComponent(category.slug)}&page=${page}&page_size=${pageSize}`,
      { method: "GET", cache: "force-cache", next: { revalidate: 30 } }
    );
  }

  const topics = topicsRes.ok ? topicsRes.data.results : [];
  const totalPages = topicsRes.ok ? Math.max(1, Math.ceil(topicsRes.data.count / pageSize)) : 1;
  const canPrev = topicsRes.ok && Boolean(topicsRes.data.previous);
  const canNext = topicsRes.ok && Boolean(topicsRes.data.next);

  return (
    <div className="relative min-h-screen">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="rv-orb rv-animate-pulse-glow" style={{ width: "450px", height: "450px", top: "-15%", left: "-10%", background: "var(--rv-accent)", opacity: 0.15 }} />
        <div className="rv-orb" style={{ width: "280px", height: "280px", bottom: "10%", right: "-5%", background: "var(--rv-cyan)", opacity: 0.10 }} />
      </div>

      {/* ── Hero ── */}
      <section className="relative border-b border-[var(--rv-border)] bg-gradient-to-b from-[var(--rv-surface)]/60 to-transparent">
        <div className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:py-16 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 mb-6 rv-label text-[9px] text-[var(--rv-text-dim)]">
            <Link href="/forum" className="hover:text-[var(--rv-accent)] transition-colors">Fórum</Link>
            <span>›</span>
            <span className="text-[var(--rv-text-muted)]">{category.name}</span>
          </nav>

          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-[var(--rv-surface-2)] border border-[var(--rv-border)] flex items-center justify-center text-2xl sm:text-3xl flex-shrink-0">
                {category.icon || "◈"}
              </div>
              <div>
                <span className="rv-badge rv-badge-cyan mb-2 inline-flex">◈ Categoria</span>
                <h1 className="rv-display text-3xl sm:text-4xl md:text-5xl text-white">{category.name}</h1>
                {category.description && (
                  <p className="mt-2 text-sm text-[var(--rv-text-muted)] max-w-lg" style={{ fontFamily: "var(--font-body)" }}>
                    {category.description}
                  </p>
                )}
              </div>
            </div>
            <ForumHeaderActions newTopicHref={`/forum/new?category=${category.slug}`} />
          </div>

          {/* Stats */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-xs sm:max-w-sm">
            {[
              { val: String(category.topic_count), label: "Tópicos" },
              { val: String(category.reply_count), label: "Respostas" },
              { val: String(page), label: `Página de ${totalPages}` },
            ].map((s) => (
              <div key={s.label} className="rv-card p-3 sm:p-4 text-center">
                <div className="rv-display text-lg sm:text-xl text-[var(--rv-accent)]">{s.val}</div>
                <div className="rv-label text-[8px] sm:text-[9px] text-[var(--rv-text-dim)] mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Topics list ── */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-10 sm:py-16 sm:px-6 lg:px-8">
        {!topicsRes.ok && (
          <div className="rv-card p-8 text-center text-[var(--rv-text-muted)]" style={{ fontFamily: "var(--font-body)" }}>
            Não foi possível carregar os tópicos.
          </div>
        )}

        {topicsRes.ok && topics.length === 0 && (
          <div className="rv-card p-12 text-center">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="rv-display text-2xl text-white mb-2">Nenhum tópico ainda</h3>
            <p className="text-[var(--rv-text-muted)] text-sm mb-6" style={{ fontFamily: "var(--font-body)" }}>
              Seja o primeiro herói a iniciar uma discussão nesta categoria.
            </p>
            <ForumHeaderActions newTopicHref={`/forum/new?category=${category.slug}`} />
          </div>
        )}

        {topics.length > 0 && (
          <div className="space-y-3">
            {topics.map((t) => (
              <Link
                key={t.id}
                href={`/forum/t/${t.slug}`}
                className="rv-card group flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-3 hover:scale-[1.005] transition-all duration-200"
              >
                {/* Left */}
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {t.is_pinned && <span className="rv-badge rv-badge-gold text-[8px]">📌 Fixado</span>}
                    {t.is_locked && <span className="rv-badge rv-badge-red text-[8px]">🔒 Fechado</span>}
                    {t.status && t.status !== "open" && (
                      <span className="rv-badge rv-badge-purple text-[8px]">{t.status}</span>
                    )}
                  </div>
                  <h3 className="rv-display text-sm sm:text-base text-white group-hover:text-[var(--rv-accent)] transition-colors line-clamp-2">
                    {t.title}
                  </h3>
                  {t.author_name && (
                    <span className="rv-label text-[9px] text-[var(--rv-text-dim)]">por {t.author_name}</span>
                  )}
                </div>

                {/* Right stats */}
                <div className="flex items-center gap-4 sm:gap-6 flex-shrink-0">
                  <div className="text-center">
                    <div className="rv-display text-sm text-[var(--rv-text-primary)]">{t.reply_count}</div>
                    <div className="rv-label text-[8px] text-[var(--rv-text-dim)]">Resp.</div>
                  </div>
                  <div className="text-center">
                    <div className="rv-display text-sm text-[var(--rv-text-primary)]">{t.view_count}</div>
                    <div className="rv-label text-[8px] text-[var(--rv-text-dim)]">Views</div>
                  </div>
                  <div className="hidden sm:block text-right min-w-[70px]">
                    <div className="rv-label text-[8px] text-[var(--rv-text-dim)]">Última resp.</div>
                    <div className="rv-label text-[9px] text-[var(--rv-text-muted)]">
                      {t.last_reply_at
                        ? new Date(t.last_reply_at).toLocaleDateString("pt-BR")
                        : new Date(t.created_at).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                  <span className="text-[var(--rv-accent)] group-hover:translate-x-1 transition-transform inline-block">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {topicsRes.ok && topicsRes.data.count > pageSize && (
          <div className="mt-8 flex items-center justify-between gap-4">
            <Link
              href={`/forum/c/${category.slug}?page=${page - 1}`}
              aria-disabled={!canPrev}
              className={`rv-btn rv-btn-ghost text-xs px-6 h-10 ${!canPrev ? "pointer-events-none opacity-30" : ""}`}
            >
              ← Anterior
            </Link>
            <span className="rv-label text-[10px] text-[var(--rv-text-dim)]">
              Página {page} de {totalPages}
            </span>
            <Link
              href={`/forum/c/${category.slug}?page=${page + 1}`}
              aria-disabled={!canNext}
              className={`rv-btn rv-btn-ghost text-xs px-6 h-10 ${!canNext ? "pointer-events-none opacity-30" : ""}`}
            >
              Próxima →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
