import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { BookOpen } from "lucide-react";

import { backendFetch } from "@/lib/backend";
import { BlogHeaderActions } from "@/app/blog/blog-header-actions";

type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

type BlogPostListItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  author_name: string;
  category_name: string;
  category_slug: string | null;
  category_id: string | null;
  is_featured: boolean;
  published_at: string | null;
  created_at: string;
  view_count: number;
  read_time_minutes: number;
  image: string | null;
  tags: string[];
  tag_slugs: string[];
};

type CategoryListItem = {
  id: string;
  name: string;
  slug: string;
  post_count: number;
};

type TagListItem = {
  id: string;
  name: string;
  slug: string;
};

export const metadata: Metadata = {
  title: "Blog | Projeto Ravenna",
  description: "Notícias, atualizações e artigos do Projeto Ravenna.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Blog | Projeto Ravenna",
    description: "Notícias, atualizações e artigos do Projeto Ravenna.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Blog | Projeto Ravenna",
    description: "Notícias, atualizações e artigos do Projeto Ravenna.",
  },
};

function getParam(searchParams: Record<string, string | string[] | undefined>, key: string): string | null {
  const v = searchParams[key];
  if (!v) return null;
  if (Array.isArray(v)) return v[0] ?? null;
  return v;
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
      next: { revalidate: 300, tags: ["blog:taxonomies", "blog:categories"] },
    }),
    backendFetch<unknown>("/api/blog/public/tags/", {
      method: "GET",
      cache: "force-cache",
      next: { revalidate: 300, tags: ["blog:taxonomies", "blog:tags"] },
    }),
  ]);

  const categories = categoriesRes.ok ? unwrapList<CategoryListItem>(categoriesRes.data) : [];
  const tags = tagsRes.ok ? unwrapList<TagListItem>(tagsRes.data) : [];

  function buildHref(nextPage: number) {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (category) sp.set("category", category);
    if (tag) sp.set("tag", tag);
    if (sort !== "recent") sp.set("sort", sort);
    if (nextPage > 1) sp.set("page", String(nextPage));
    const s = sp.toString();
    return `/blog${s ? `?${s}` : ""}`;
  }

  function buildHrefWith(next: { q?: string; category?: string; tag?: string; sort?: "recent" | "popular"; page?: number }) {
    const sp = new URLSearchParams();
    const nq = (next.q ?? q).trim();
    const nc = (next.category ?? category).trim();
    const nt = (next.tag ?? tag).trim();
    const ns = next.sort ?? sort;
    const np = next.page ?? 1;

    if (nq) sp.set("q", nq);
    if (nc) sp.set("category", nc);
    if (nt) sp.set("tag", nt);
    if (ns !== "recent") sp.set("sort", ns);
    if (np > 1) sp.set("page", String(np));
    const s = sp.toString();
    return `/blog${s ? `?${s}` : ""}`;
  }

  const canPrev = postsRes.ok ? Boolean(postsRes.data.previous) : false;
  const canNext = postsRes.ok ? Boolean(postsRes.data.next) : false;
  const hasFilters = Boolean(q || category || tag || sort !== "recent");
  const categoryLabel = category ? categories.find((c) => c.slug === category)?.name ?? category : null;
  const tagLabel = tag ? tags.find((t) => t.slug === tag)?.name ?? tag : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5 rotate-12 pointer-events-none">
          <BookOpen className="h-40 w-40 text-primary" aria-hidden="true" />
        </div>
        <div className="relative z-10 space-y-2">
          <h1 className="text-5xl font-black tracking-tighter flex items-center gap-6">
            <div className="h-16 w-16 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/10">
              <BookOpen className="h-8 w-8 text-primary" aria-hidden="true" />
            </div>
            Blog
          </h1>
          <p className="text-muted-foreground text-lg font-medium max-w-xl">Notícias e posts do Projeto Ravenna.</p>
        </div>
        <div className="relative z-10 flex items-center gap-4">
          <BlogHeaderActions />
          <Link href="/" className="text-sm font-medium text-foreground hover:underline">
            Voltar
          </Link>
        </div>
      </div>

      <form
        action="/blog"
        method="get"
        className="mt-8 grid gap-3 rounded-2xl border border-foreground/10 bg-background p-4 md:grid-cols-5"
      >
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-medium text-foreground/70" htmlFor="q">
            Busca
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Buscar por título ou conteúdo…"
            className="h-10 w-full rounded-xl border border-foreground/15 bg-background px-3 text-sm text-foreground outline-none ring-foreground/20 focus:ring-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-foreground/70" htmlFor="category">
            Categoria
          </label>
          <select
            id="category"
            name="category"
            defaultValue={category}
            className="h-10 w-full rounded-xl border border-foreground/15 bg-background px-3 text-sm text-foreground outline-none ring-foreground/20 focus:ring-2"
          >
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name} ({c.post_count})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-foreground/70" htmlFor="tag">
            Tag
          </label>
          <select
            id="tag"
            name="tag"
            defaultValue={tag}
            className="h-10 w-full rounded-xl border border-foreground/15 bg-background px-3 text-sm text-foreground outline-none ring-foreground/20 focus:ring-2"
          >
            <option value="">Todas</option>
            {tags.map((t) => (
              <option key={t.id} value={t.slug}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-foreground/70" htmlFor="sort">
            Ordenar
          </label>
          <select
            id="sort"
            name="sort"
            defaultValue={sort}
            className="h-10 w-full rounded-xl border border-foreground/15 bg-background px-3 text-sm text-foreground outline-none ring-foreground/20 focus:ring-2"
          >
            <option value="recent">Mais recentes</option>
            <option value="popular">Mais vistos</option>
          </select>
        </div>

        <div className="flex items-center gap-3 md:col-span-5">
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-foreground px-4 text-sm font-medium text-background hover:opacity-90"
          >
            Filtrar
          </button>
          {hasFilters ? (
            <Link href="/blog" className="text-sm font-medium text-foreground hover:underline">
              Limpar
            </Link>
          ) : null}
          <div className="ml-auto text-xs text-foreground/60">
            {postsRes.ok ? `${postsRes.data.count} resultados` : null}
          </div>
        </div>
      </form>

      {hasFilters ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {q ? (
            <Link
              href={buildHrefWith({ q: "", page: 1 })}
              className="inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-background px-3 py-1 text-xs font-medium text-foreground hover:bg-foreground/5"
            >
              Busca: {q} <span className="text-foreground/60">×</span>
            </Link>
          ) : null}
          {category ? (
            <Link
              href={buildHrefWith({ category: "", page: 1 })}
              className="inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-background px-3 py-1 text-xs font-medium text-foreground hover:bg-foreground/5"
            >
              Categoria: {categoryLabel} <span className="text-foreground/60">×</span>
            </Link>
          ) : null}
          {tag ? (
            <Link
              href={buildHrefWith({ tag: "", page: 1 })}
              className="inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-background px-3 py-1 text-xs font-medium text-foreground hover:bg-foreground/5"
            >
              Tag: {tagLabel} <span className="text-foreground/60">×</span>
            </Link>
          ) : null}
          {sort !== "recent" ? (
            <Link
              href={buildHrefWith({ sort: "recent", page: 1 })}
              className="inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-background px-3 py-1 text-xs font-medium text-foreground hover:bg-foreground/5"
            >
              Ordenação: mais vistos <span className="text-foreground/60">×</span>
            </Link>
          ) : null}
          <Link href="/blog" className="ml-auto text-xs font-medium text-foreground hover:underline">
            Limpar tudo
          </Link>
        </div>
      ) : null}

      <BlogPostList posts={postsRes.ok ? postsRes.data : null} current={{ q, category, tag, sort }} />

      {postsRes.ok ? (
        <div className="mt-8 flex items-center justify-between gap-4">
          <Link
            href={buildHref(page - 1)}
            aria-disabled={!canPrev}
            className={[
              "inline-flex h-10 items-center justify-center rounded-xl border border-foreground/15 bg-background px-4 text-sm font-medium text-foreground",
              canPrev ? "hover:bg-foreground/5" : "pointer-events-none opacity-50",
            ].join(" ")}
          >
            Anterior
          </Link>
          <div className="text-xs text-foreground/60">Página {page}</div>
          <Link
            href={buildHref(page + 1)}
            aria-disabled={!canNext}
            className={[
              "inline-flex h-10 items-center justify-center rounded-xl border border-foreground/15 bg-background px-4 text-sm font-medium text-foreground",
              canNext ? "hover:bg-foreground/5" : "pointer-events-none opacity-50",
            ].join(" ")}
          >
            Próxima
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function BlogPostList({
  posts,
  current,
}: {
  posts: Paginated<BlogPostListItem> | null;
  current: { q: string; category: string; tag: string; sort: "recent" | "popular" };
}) {
  if (!posts) {
    return (
      <div className="mt-8 rounded-2xl border border-foreground/10 bg-background p-5 text-sm text-foreground/80">
        Não foi possível carregar os posts do backend.
      </div>
    );
  }

  function makeHref(next: { q?: string; category?: string; tag?: string; sort?: "recent" | "popular"; page?: number }) {
    const sp = new URLSearchParams();
    const nq = (next.q ?? current.q).trim();
    const nc = (next.category ?? current.category).trim();
    const nt = (next.tag ?? current.tag).trim();
    const ns = next.sort ?? current.sort;
    const np = next.page ?? 1;

    if (nq) sp.set("q", nq);
    if (nc) sp.set("category", nc);
    if (nt) sp.set("tag", nt);
    if (ns !== "recent") sp.set("sort", ns);
    if (np > 1) sp.set("page", String(np));
    const s = sp.toString();
    return `/blog${s ? `?${s}` : ""}`;
  }

  return (
    <div className="mt-8 grid gap-4 md:grid-cols-2">
      {posts.results.map((p) => {
        const postHref = `/blog/${p.slug}`;
        return (
          <div key={p.id} className="rounded-2xl border border-foreground/10 bg-background p-5 hover:bg-foreground/5">
            {p.image ? (
              <Link href={postHref} className="mb-4 block overflow-hidden rounded-xl border border-foreground/10">
                <Image
                  src={p.image}
                  alt={p.title}
                  width={1200}
                  height={480}
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="h-40 w-full object-cover"
                />
              </Link>
            ) : null}
          <div className="flex items-center justify-between gap-4">
            {p.category_slug ? (
              <Link
                href={makeHref({ category: p.category_slug, page: 1 })}
                className="text-xs font-medium text-foreground/70 hover:underline"
              >
                {p.category_name}
              </Link>
            ) : (
              <div className="text-xs font-medium text-foreground/70">{p.category_name}</div>
            )}
            <div className="text-xs text-foreground/60">{p.read_time_minutes} min</div>
          </div>
          <Link href={postHref} className="mt-2 block text-base font-semibold text-foreground">
            {p.title}
          </Link>
          <div className="mt-2 text-sm text-foreground/80">{p.excerpt}</div>
          {p.tags.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {p.tags.slice(0, 3).map((t, idx) => (
                <Link
                  key={`${p.id}-${t}`}
                  href={makeHref({ tag: p.tag_slugs[idx] ?? t, page: 1 })}
                  className="inline-flex items-center rounded-full border border-foreground/15 bg-background px-2 py-0.5 text-[11px] font-medium text-foreground/80 hover:bg-foreground/5"
                >
                  {t}
                </Link>
              ))}
              {p.tags.length > 3 ? (
                <span className="text-[11px] font-medium text-foreground/60">+{p.tags.length - 3}</span>
              ) : null}
            </div>
          ) : null}
          <div className="mt-4 text-xs text-foreground/60">
            por {p.author_name} · {p.view_count} views
          </div>
          </div>
        );
      })}
    </div>
  );
}
