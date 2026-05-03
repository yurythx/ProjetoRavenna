import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { backendFetch } from "@/lib/backend";
import { BlogHeaderActions } from "@/app/blog/blog-header-actions";

type Paginated<T> = { count: number; next: string | null; previous: string | null; results: T[] };
type BlogPost = {
  id: string; title: string; slug: string; excerpt: string;
  author_name: string; category_name: string;
  published_at: string | null; read_time_minutes: number;
  image: string | null;
};
type Category = { id: string; name: string; slug: string; post_count: number };

export const metadata: Metadata = {
  title: "Blog | RAVENNA",
  description: "Noticias e atualizações do universo Ravenna.",
};

export default async function BlogPage(props: any) {
  const searchParams = await props.searchParams;
  const q = searchParams?.q || "";
  const category = searchParams?.category || "";
  
  const [postsRes, catsRes] = await Promise.all([
    backendFetch<Paginated<BlogPost>>(`/api/v1/blog/public/posts/?search=${q}&category=${category}`, { method: "GET" }),
    backendFetch<Category[]>("/api/v1/blog/public/categories/", { method: "GET" })
  ]);

  const posts = postsRes.ok ? postsRes.data.results : [];
  const categories = catsRes.ok ? (Array.isArray(catsRes.data) ? catsRes.data : []) : [];

  return (
    <div className="relative min-h-screen bg-[var(--rv-surface)]">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="rv-orb" style={{ width: "600px", height: "600px", top: "-10%", right: "-5%", background: "var(--rv-accent)", opacity: 0.1 }} />
      </div>

      {/* Hero */}
      <section className="relative border-b border-[var(--rv-border)] py-16 sm:py-24">
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-8">
            <div>
              <span className="rv-badge rv-badge-purple mb-4">CRONICAS</span>
              <h1 className="rv-display text-5xl sm:text-7xl text-white">Blog e Novidades</h1>
              <p className="mt-4 text-[var(--rv-text-muted)] max-w-lg">
                Atualizações e lore do universo Ravenna.
              </p>
            </div>
            <BlogHeaderActions />
          </div>
        </div>
      </section>

      {/* Main */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-8">
          <div className="grid gap-6 sm:grid-cols-2">
            {posts.map((p) => (
              <article key={p.id} className="rv-card group overflow-hidden">
                <Link href={`/blog/${p.slug}`} className="relative block h-48 bg-black/20">
                  {p.image && <Image src={p.image} alt={p.title} fill className="object-cover" />}
                </article>
                <div className="p-6 space-y-4">
                  <h3 className="rv-display text-lg text-white group-hover:text-[var(--rv-accent)]">{p.title}</h3>
                  <p className="text-xs text-[var(--rv-text-muted)] line-clamp-3">{p.excerpt}</p>
                  <Link href={`/blog/${p.slug}`} className="text-xs text-[var(--rv-accent)] block">Ler mais →</Link>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="lg:col-span-4 space-y-6">
          <div className="rv-card p-6">
            <h3 className="rv-display text-lg text-white mb-4">Categorias</h3>
            <div className="flex flex-col gap-2">
              {categories.map((c: any) => (
                <Link key={c.id} href={`/blog?category=${c.slug}`} className="text-sm text-[var(--rv-text-muted)] hover:text-white">
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
