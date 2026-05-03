import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

import { backendFetch } from "@/lib/backend";
import { BlogHeaderActions } from "@/app/blog/blog-header-actions";

type Paginated<T> = { count: number; next: string | null; previous: string | null; results: T[] };

type BlogPostListItem = {
  id: string; title: string; slug: string; excerpt: string;
  author_name: string; category_name: string; category_slug: string | null;
  category_id: string | null; is_featured: boolean;
  published_at: string | null; created_at: string;
  view_count: number; read_time_minutes: number;
  image: string | null; tags: string[]; tag_slugs: string[];
};

type CategoryListItem = { id: string; name: string; slug: string; post_count: number };
type TagListItem = { id: string; name: string; slug: string };

export const metadata: Metadata = {
  title: "Blog | RAVENNA",
  description: "Patch notes, lore, notícias e atualizações do universo Ravenna.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Blog | RAVENNA",
    description: "Patch notes e lore do universo Ravenna.",
    type: "website",
  },
};

function getParam(sp: Record<string, string | string[] | undefined>, key: string): string | null {
  const v = sp[key];
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const d = data as { results?: unknown };
    if (Array.isArray(d.results)) return d.results as T[];
  }
  return [];
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const q = (getParam(sp, "q") ?? "").trim();
  const category = (getParam(sp, "category") ?? "").trim();
  const tag = (getParam(sp, "tag") ?? "").trim();
  const sortRaw = (getParam(sp, "sort") ?? "recent").trim();
  const sort = sortRaw === "popular" ? "popular" : "recent";
  const pageRaw = (getParam(sp, "page") ?? "1").trim();
  const page = Math.max(1, Number.parseInt(pageRaw, 10) || 1);
  const pageSize = 20;

  const qs = new URLSearchParams();
  qs.set("page", String(page));
  qs.set("page_size", String(pageSize));
  if (q) qs.set("search", q);
  if (category) qs.set("category", category);
  if (tag) qs.set("tag", tag);
  if (sort === "popular") qs.set("ordering", "-view_count");

  const [postsRes, categoriesRes, tagsRes] = await Promise.all([
    backendFetch<Paginated<BlogPostListItem>>(`/api/blog/public/posts/?${qs.toString()}`, {
      method: "GET",
      cache: "force-cache",
      next: { revalidate: 60, tags: ["blog:posts"] },
    }),
    backendFetch<unknown>("/api/blog/public/categories/", {
      method: "GET",
      cache: "force-cache",
      next: { revalidate: 300, tags: ["blog:taxonomies"] },
    }),
    backendFetch<unknown>("/api/blog/public/tags/", {
      method: "GET",
      cache: "force-cache",
      next: { revalidate: 300, tags: ["blog:taxonomies"] },
    }),
  ]);

  const categories = categoriesRes.ok ? unwrapList<CategoryListItem>(categoriesRes.data) : [];
  const tags = tagsRes.ok ? unwrapList<TagListItem>(tagsRes.data) : [];

  function buildHrefWith(next: { q?: string; category?: string; tag?: string; sort?: "recent" | "popular"; page?: number }) {
    const p = new URLSearchParams();
    const nq = (next.q ?? q).trim();
    const nc = (next.category ?? category).trim();
    const nt = (next.tag ?? tag).trim();
    const ns = next.sort ?? sort;
    const np = next.page ?? 1;
    if (nq) p.set("q", nq);
    if (nc) p.set("category", nc);
    if (nt) p.set("tag", nt);
    if (ns !== "recent") p.set("sort", ns);
    if (np > 1) p.set("page", String(np));
    const s = p.toString();
    return `/blog${s ? `?${s}` : ""}`;
  }

  const canPrev = postsRes.ok ? Boolean(postsRes.data.previous) : false;
  const canNext = postsRes.ok ? Boolean(postsRes.data.next) : false;
  const hasFilters = Boolean(q || category || tag || sort !== "recent");
  const categories_ = categories;
  const tags_ = tags;

  return (
    <div className="relative min-h-screen">
      {/* Ambient Orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="rv-orb rv-animate-pulse-glow" style={{ width: "600px", height: "600px", top: "-10%", right: "-5%", background: "var(--rv-accent)", opacity: 0.15 }} />
        <div className="rv-orb" style={{ width: "400px", height: "400px", bottom: "5%", left: "-10%", background: "var(--rv-purple)", opacity: 0.12 }} />
      </div>

      {/* ── Hero ── */}
      <section className="relative border-b border-[var(--rv-border)] bg-gradient-to-b from-[var(--rv-surface)]/80 to-transparent">
        <div className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50V18L28 2l28 16v32L28 66zm0-2l26-15V19L28 4 2 19v30l26 15z' fill='none' stroke='%238b5cf6' stroke-width='1'/%3E%3C/svg%3E\")" }}
        />
        <div className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:py-24 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-8">
            <div className="space-y-4">
              <span className="rv-badge rv-badge-purple inline-flex">✦ Diário de Ravenna</span>
              <h1 className="rv-display text-5xl sm:text-6xl md:text-7xl text-white tracking-tight">Lore &amp;<br /><span className="text-[var(--rv-accent)]">Novidades</span></h1>
              <p className="mt-4 text-[var(--rv-text-muted)] max-w-lg text-sm sm:text-base leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
                Explore as crônicas do reino, patch notes detalhados e guias épicos criados pela equipe e pela comunidade.
              </p>
            </div>
            <div className="flex-shrink-0">
              <BlogHeaderActions />
            </div>
          </div>

          {/* Stats Bar */}
          <div className="mt-12 flex flex-wrap gap-4">
            {[
              { val: postsRes.ok ? String(postsRes.data.count) : "—", label: "Crônicas" },
              { val: String(categories.length), label: "Categorias" },
              { val: String(tags.length), label: "Tags" },
            ].map((s) => (
              <div key={s.label} className="rv-card px-6 py-4 flex flex-col items-center min-w-[100px] bg-white/5 backdrop-blur-sm border-white/10">
                <div className="rv-display text-xl sm:text-2xl text-[var(--rv-accent)]">{s.val}</div>
                <div className="rv-label text-[8px] sm:text-[9px] uppercase tracking-widest text-[var(--rv-text-dim)] mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Main ── */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Content */}
        <div className="lg:col-span-8 space-y-8">
          {/* Search + Filters */}
          <form action="/blog" method="get" className="rv-card p-6">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <div className="sm:col-span-2">
                <label className="rv-label-field" htmlFor="q">Buscar</label>
                <input
                  id="q" name="q" defaultValue={q}
                  placeholder="Buscar no lore..."
                  className="rv-input"
                />
              </div>
              <div>
                <label className="rv-label-field" htmlFor="category">Categoria</label>
                <select id="category" name="category" defaultValue={category}
                  className="rv-input" style={{ cursor: "pointer" }}>
                  <option value="">Todas</option>
                  {categories_.map((c) => (
                    <option key={c.id} value={c.slug}>{c.name} ({c.post_count})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="rv-label-field" htmlFor="sort">Ordenar</label>
                <select id="sort" name="sort" defaultValue={sort}
                  className="rv-input" style={{ cursor: "pointer" }}>
                  <option value="recent">Mais recentes</option>
                  <option value="popular">Mais vistos</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <button type="submit" className="rv-btn rv-btn-primary text-xs px-6 h-10">
                Filtrar
              </button>
              {hasFilters && (
                <Link href="/blog" className="rv-label text-[10px] text-[var(--rv-text-muted)] hover:text-[var(--rv-accent)] transition-colors">
                  Limpar filtros ×
                </Link>
              )}
              <span className="ml-auto rv-label text-[10px] text-[var(--rv-text-dim)]">
                {postsRes.ok ? `${postsRes.data.count} resultados` : ""}
              </span>
            </div>
          </form>

          {/* Active filters pills */}
          {hasFilters && (
            <div className="flex flex-wrap gap-2">
              {q && (
                <Link href={buildHrefWith({ q: "", page: 1 })}
                  className="rv-badge rv-badge-purple gap-2 cursor-pointer">
                  Busca: {q} <span>×</span>
                </Link>
              )}
              {category && (
                <Link href={buildHrefWith({ category: "", page: 1 })}
                  className="rv-badge rv-badge-cyan gap-2 cursor-pointer">
                  {categories_.find((c) => c.slug === category)?.name ?? category} <span>×</span>
                </Link>
              )}
              {sort !== "recent" && (
                <Link href={buildHrefWith({ sort: "recent", page: 1 })}
                  className="rv-badge rv-badge-gold gap-2 cursor-pointer">
                  Mais vistos <span>×</span>
                </Link>
              )}
            </div>
          )}

          {/* Posts grid */}
          {!postsRes.ok ? (
            <div className="rv-card p-8 text-center text-[var(--rv-text-muted)]" style={{ fontFamily: "var(--font-body)" }}>
              Não foi possível carregar os posts do backend.
            </div>
          ) : postsRes.data.results.length === 0 ? (
            <div className="rv-card p-12 text-center">
              <div className="text-4xl mb-4">📜</div>
              <h3 className="rv-display text-2xl text-white mb-2">Nenhum post encontrado</h3>
              <p className="text-[var(--rv-text-muted)] text-sm" style={{ fontFamily: "var(--font-body)" }}>
                Tente outros filtros ou aguarde novos artigos.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {postsRes.data.results.map((p) => {
                const href = `/blog/${p.slug}`;
                return (
                  <article key={p.id} className="rv-card group flex flex-col overflow-hidden hover:scale-[1.01] transition-all duration-200">
                    {p.image ? (
                      <Link href={href} className="block overflow-hidden border-b border-[var(--rv-border)]">
                        <Image
                          src={p.image} alt={p.title}
                          width={800} height={340}
                          sizes="(min-width: 768px) 40vw, 90vw"
                          className="h-44 w-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </Link>
                    ) : (
                      <div className="h-36 bg-gradient-to-br from-[var(--rv-surface-2)] to-[var(--rv-surface)] border-b border-[var(--rv-border)] flex items-center justify-center">
                        <span className="text-4xl opacity-30">📜</span>
                      </div>
                    )}

                    <div className="flex flex-col flex-1 p-6 gap-3">
                      <div className="flex items-center justify-between">
                        {p.category_slug ? (
                          <Link href={buildHrefWith({ category: p.category_slug, page: 1 })}
                            className="rv-badge rv-badge-purple hover:opacity-80 transition-opacity">
                            {p.category_name}
                          </Link>
                        ) : (
                          <span className="rv-badge rv-badge-purple">{p.category_name}</span>
                        )}
                        <span className="rv-label text-[9px] text-[var(--rv-text-dim)]">
                          {p.read_time_minutes} min
                        </span>
                      </div>

                      <Link href={href}>
                        <h2 className="rv-display text-xl text-white leading-snug group-hover:text-[var(--rv-accent)] transition-colors line-clamp-2">
                          {p.title}
                        </h2>
                      </Link>

                      <p className="text-sm text-[var(--rv-text-muted)] line-clamp-2 flex-1" style={{ fontFamily: "var(--font-body)" }}>
                        {p.excerpt}
                      </p>

                      {p.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {p.tags.slice(0, 3).map((t, idx) => (
                            <Link key={`${p.id}-${t}`}
                              href={buildHrefWith({ tag: p.tag_slugs[idx] ?? t, page: 1 })}
                              className="rv-badge rv-badge-cyan text-[9px] hover:opacity-80">
                              {t}
                            </Link>
                          ))}
                          {p.tags.length > 3 && (
                            <span className="rv-badge rv-badge-purple text-[9px]">+{p.tags.length - 3}</span>
                          )}
                        </div>
                      )}

                      <div className="rv-divider" />
                      <div className="flex items-center justify-between">
                        <span className="rv-label text-[9px] text-[var(--rv-text-dim)]">
                          por {p.author_name} · {p.view_count} views
                        </span>
                        <Link href={href}
                          className="rv-label text-[10px] text-[var(--rv-accent)] hover:underline flex items-center gap-1">
                          Ler <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {postsRes.ok && (canPrev || canNext) && (
            <div className="flex items-center justify-between gap-4">
              <Link
                href={buildHrefWith({ page: page - 1 })}
                aria-disabled={!canPrev}
                className={`rv-btn rv-btn-ghost text-xs px-6 h-10 ${!canPrev ? "pointer-events-none opacity-30" : ""}`}
              >
                ← Anterior
              </Link>
              <span className="rv-label text-[10px] text-[var(--rv-text-dim)]">Página {page}</span>
              <Link
                href={buildHrefWith({ page: page + 1 })}
                aria-disabled={!canNext}
                className={`rv-btn rv-btn-ghost text-xs px-6 h-10 ${!canNext ? "pointer-events-none opacity-30" : ""}`}
              >
                Próxima →
              </Link>
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <aside className="lg:col-span-4 space-y-6">
          {/* Categories */}
          <div className="rv-card p-6">
            <h3 className="rv-display text-lg text-white mb-5 flex items-center gap-2">
              <span className="text-[var(--rv-accent)]">◆</span> Categorias
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/blog"
                  className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all ${!category ? "bg-[var(--rv-accent-glow)] text-[var(--rv-accent)] border border-[var(--rv-border-hover)]" : "text-[var(--rv-text-muted)] hover:text-white hover:bg-white/5"}`}>
                  <span className="rv-label text-[10px]">Todas</span>
                  <span className="rv-label text-[9px] text-[var(--rv-text-dim)]">{postsRes.ok ? postsRes.data.count : "—"}</span>
                </Link>
              </li>
              {categories_.map((c) => (
                <li key={c.id}>
                  <Link href={buildHrefWith({ category: c.slug, page: 1 })}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all ${category === c.slug ? "bg-[var(--rv-accent-glow)] text-[var(--rv-accent)] border border-[var(--rv-border-hover)]" : "text-[var(--rv-text-muted)] hover:text-white hover:bg-white/5"}`}>
                    <span className="rv-label text-[10px]">{c.name}</span>
                    <span className="rv-label text-[9px] text-[var(--rv-text-dim)]">{c.post_count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Tags */}
          {tags_.length > 0 && (
            <div className="rv-card p-6">
              <h3 className="rv-display text-lg text-white mb-5 flex items-center gap-2">
                <span className="text-[var(--rv-cyan)]">◈</span> Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {tags_.map((t) => (
                  <Link key={t.id} href={buildHrefWith({ tag: t.slug, page: 1 })}
                    className={`rv-badge cursor-pointer transition-all ${tag === t.slug ? "rv-badge-purple" : "rv-badge-cyan hover:opacity-80"}`}>
                    {t.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="rv-card p-6 border-[var(--rv-accent)]/30"
            style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(6,182,212,0.05))" }}>
            <h3 className="rv-display text-lg text-white mb-2">Faça parte da lenda</h3>
            <p className="text-sm text-[var(--rv-text-muted)] mb-4" style={{ fontFamily: "var(--font-body)" }}>
              Crie sua conta e entre na comunidade Ravenna.
            </p>
            <Link href="/register" className="rv-btn rv-btn-primary w-full h-11 text-xs">
              Criar Conta Grátis
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
