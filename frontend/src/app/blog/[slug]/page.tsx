import Link from "next/link";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { BlogComments } from "@/components/blog-comments";
import { backendFetch } from "@/lib/backend";
import { sanitizeRichTextHtml } from "@/lib/sanitize-html";

type BlogPostDetail = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author_name: string;
  is_featured: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  view_count: number;
  read_time_minutes: number;
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  image: string | null;
  tags: { id: string; name: string; slug: string }[];
  category: { id: string; name: string; slug: string };
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const res = await backendFetch<BlogPostDetail>(`/api/blog/public/posts/${encodeURIComponent(slug)}/`, {
    method: "GET",
    cache: "force-cache",
    next: { revalidate: 60, tags: [`blog:post:${slug}`] },
  });
  if (!res.ok) return {};

  const post = res.data;
  const title = post.meta_title?.trim() ? post.meta_title : post.title;
  const description = post.meta_description?.trim() ? post.meta_description : post.excerpt;
  const canonical = `/blog/${encodeURIComponent(slug)}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "article",
      images: post.image ? [{ url: post.image }] : undefined,
    },
    twitter: {
      card: post.image ? "summary_large_image" : "summary",
      title,
      description,
      images: post.image ? [post.image] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const res = await backendFetch<BlogPostDetail>(`/api/blog/public/posts/${encodeURIComponent(slug)}/`, {
    method: "GET",
    cache: "force-cache",
    next: { revalidate: 60, tags: [`blog:post:${slug}`] },
  });

  if (!res.ok) {
    if (res.error.status === 404) notFound();
    throw new Error("Falha ao carregar o post.");
  }

  const post = res.data;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link href="/blog" className="text-sm font-medium text-foreground hover:underline">
        Voltar
      </Link>

      <div className="mt-6 flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{post.title}</h1>
        <div className="text-sm text-foreground/70">
          por {post.author_name} · {post.read_time_minutes} min · {post.view_count} views
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {post.category?.slug ? (
            <Link href={`/blog?category=${encodeURIComponent(post.category.slug)}`} className="text-foreground/70 hover:underline">
              {post.category.name}
            </Link>
          ) : null}
          {post.tags?.length ? (
            <div className="flex flex-wrap items-center gap-2">
              {post.tags.map((t) => (
                <Link
                  key={t.id}
                  href={`/blog?tag=${encodeURIComponent(t.slug)}`}
                  className="inline-flex items-center rounded-full border border-foreground/15 bg-background px-2 py-0.5 text-[11px] font-medium text-foreground/80 hover:bg-foreground/5"
                >
                  {t.name}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
        <div className="mt-2 text-base text-foreground/80">{post.excerpt}</div>
      </div>

      {post.image ? (
        <div className="mt-8 overflow-hidden rounded-2xl border border-foreground/10 bg-background">
          <Image
            src={post.image}
            alt={post.title}
            width={1600}
            height={900}
            sizes="100vw"
            className="h-auto w-full object-cover"
            priority
          />
        </div>
      ) : null}

      <article className="mt-8 rounded-2xl border border-foreground/10 bg-background p-5">
        <div
          className="prose prose-sm sm:prose-base dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(post.content) }}
        />
      </article>

      <BlogComments postId={post.id} postSlug={post.slug} />
    </div>
  );
}
