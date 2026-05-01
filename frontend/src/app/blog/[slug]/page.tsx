import Link from "next/link";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";

import { BlogComments } from "@/components/blog-comments";
import { backendFetch } from "@/lib/backend";
import { sanitizeRichTextHtml } from "@/lib/sanitize-html";

type BlogPostDetail = {
  id: string; title: string; slug: string; excerpt: string;
  content: string; author_name: string; is_featured: boolean;
  published_at: string | null; created_at: string; updated_at: string;
  view_count: number; read_time_minutes: number;
  meta_title: string; meta_description: string; meta_keywords: string;
  image: string | null;
  tags: { id: string; name: string; slug: string }[];
  category: { id: string; name: string; slug: string };
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const res = await backendFetch<BlogPostDetail>(`/api/blog/public/posts/${encodeURIComponent(slug)}/`, {
    method: "GET", cache: "force-cache", next: { revalidate: 60, tags: [`blog:post:${slug}`] },
  });
  if (!res.ok) return { title: "Post | RAVENNA Blog" };
  const post = res.data;
  const title = post.meta_title?.trim() ? post.meta_title : post.title;
  const description = post.meta_description?.trim() ? post.meta_description : post.excerpt;
  return {
    title: `${title} | RAVENNA Blog`,
    description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: { title, description, type: "article", images: post.image ? [{ url: post.image }] : undefined },
    twitter: { card: post.image ? "summary_large_image" : "summary", title, description },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const res = await backendFetch<BlogPostDetail>(`/api/blog/public/posts/${encodeURIComponent(slug)}/`, {
    method: "GET", cache: "force-cache", next: { revalidate: 60, tags: [`blog:post:${slug}`] },
  });

  if (!res.ok) {
    if (res.error.status === 404) notFound();
    throw new Error("Falha ao carregar o post.");
  }

  const post = res.data;
  const publishedDate = post.published_at
    ? new Date(post.published_at).toLocaleDateString("pt-BR", { year: "numeric", month: "long", day: "numeric" })
    : new Date(post.created_at).toLocaleDateString("pt-BR", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="relative min-h-screen">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="rv-orb rv-animate-pulse-glow" style={{ width: "500px", height: "500px", top: "-10%", left: "-10%", background: "var(--rv-accent)", opacity: 0.14 }} />
        <div className="rv-orb" style={{ width: "280px", height: "280px", bottom: "10%", right: "-5%", background: "var(--rv-cyan)", opacity: 0.08 }} />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4 py-8 sm:py-14 sm:px-6 lg:px-8">
        {/* ── Breadcrumb ── */}
        <nav className="flex items-center gap-2 mb-8 rv-label text-[9px] text-[var(--rv-text-dim)] flex-wrap">
          <Link href="/" className="hover:text-[var(--rv-accent)] transition-colors">Início</Link>
          <span>›</span>
          <Link href="/blog" className="hover:text-[var(--rv-accent)] transition-colors">Blog</Link>
          {post.category?.slug && (
            <>
              <span>›</span>
              <Link href={`/blog?category=${encodeURIComponent(post.category.slug)}`}
                className="hover:text-[var(--rv-accent)] transition-colors">
                {post.category.name}
              </Link>
            </>
          )}
          <span>›</span>
          <span className="text-[var(--rv-text-muted)] truncate max-w-[200px]">{post.title}</span>
        </nav>

        {/* ── Meta badges ── */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {post.category?.slug && (
            <Link href={`/blog?category=${encodeURIComponent(post.category.slug)}`}
              className="rv-badge rv-badge-purple hover:opacity-80 transition-opacity">
              {post.category.name}
            </Link>
          )}
          {post.is_featured && <span className="rv-badge rv-badge-gold">⭐ Destaque</span>}
          {post.tags?.map((t) => (
            <Link key={t.id} href={`/blog?tag=${encodeURIComponent(t.slug)}`}
              className="rv-badge rv-badge-cyan hover:opacity-80">
              {t.name}
            </Link>
          ))}
        </div>

        {/* ── Title ── */}
        <h1 className="rv-display text-3xl sm:text-4xl md:text-5xl text-white leading-tight mb-6">
          {post.title}
        </h1>

        {/* ── Author + meta ── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[var(--rv-accent)] to-[var(--rv-cyan)] flex items-center justify-center text-white font-black text-sm flex-shrink-0">
              {post.author_name[0].toUpperCase()}
            </div>
            <div>
              <div className="rv-label text-[10px] text-[var(--rv-text-dim)]">Autor</div>
              <div className="text-sm font-semibold text-[var(--rv-text-primary)]">{post.author_name}</div>
            </div>
          </div>
          <div className="rv-divider hidden sm:block" style={{ width: "1px", height: "32px", background: "var(--rv-border)" }} />
          <div className="flex flex-wrap gap-4">
            <div>
              <div className="rv-label text-[9px] text-[var(--rv-text-dim)]">Publicado</div>
              <div className="text-xs text-[var(--rv-text-muted)]">{publishedDate}</div>
            </div>
            <div>
              <div className="rv-label text-[9px] text-[var(--rv-text-dim)]">Leitura</div>
              <div className="text-xs text-[var(--rv-text-muted)]">{post.read_time_minutes} min</div>
            </div>
            <div>
              <div className="rv-label text-[9px] text-[var(--rv-text-dim)]">Visualizações</div>
              <div className="text-xs text-[var(--rv-text-muted)]">{post.view_count}</div>
            </div>
          </div>
        </div>

        {/* ── Excerpt ── */}
        {post.excerpt && (
          <p className="text-[var(--rv-text-muted)] text-base sm:text-lg leading-relaxed mb-8 border-l-2 border-[var(--rv-accent)] pl-4"
            style={{ fontFamily: "var(--font-body)" }}>
            {post.excerpt}
          </p>
        )}

        {/* ── Cover image ── */}
        {post.image && (
          <div className="mb-10 overflow-hidden rounded-2xl border border-[var(--rv-border)]">
            <Image
              src={post.image} alt={post.title}
              width={1600} height={900} sizes="100vw"
              className="h-auto w-full object-cover"
              priority
            />
          </div>
        )}

        {/* ── Content ── */}
        <article className="rv-card p-6 sm:p-10 mb-10">
          <div
            className="prose prose-base sm:prose-lg prose-invert max-w-none
              prose-p:text-[var(--rv-text-muted)] prose-p:leading-relaxed
              prose-headings:text-white prose-headings:font-black
              prose-h2:rv-display prose-h3:rv-display
              prose-a:text-[var(--rv-accent)] prose-a:no-underline hover:prose-a:underline
              prose-code:text-[var(--rv-cyan)] prose-code:bg-[var(--rv-surface-2)] prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm
              prose-pre:bg-[var(--rv-surface-2)] prose-pre:border prose-pre:border-[var(--rv-border)] prose-pre:rounded-xl
              prose-blockquote:border-l-[var(--rv-accent)] prose-blockquote:text-[var(--rv-text-muted)] prose-blockquote:not-italic
              prose-img:rounded-xl prose-img:border prose-img:border-[var(--rv-border)]
              prose-strong:text-white prose-em:text-[var(--rv-accent)]
              prose-ul:text-[var(--rv-text-muted)] prose-ol:text-[var(--rv-text-muted)]
              prose-hr:border-[var(--rv-border)]"
            dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(post.content) }}
          />
        </article>

        {/* ── Footer nav ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
          <Link href="/blog" className="rv-btn rv-btn-ghost text-xs px-6 h-10 gap-2">
            ← Voltar ao Blog
          </Link>
          <div className="flex flex-wrap gap-2">
            {post.tags?.map((t) => (
              <Link key={t.id} href={`/blog?tag=${encodeURIComponent(t.slug)}`}
                className="rv-badge rv-badge-cyan hover:opacity-80 text-[9px]">
                {t.name}
              </Link>
            ))}
          </div>
        </div>

        {/* ── Comments ── */}
        <div className="rv-card p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="rv-badge rv-badge-purple">💬 Comentários</span>
          </div>
          <BlogComments postId={post.id} postSlug={post.slug} />
        </div>
      </div>
    </div>
  );
}
