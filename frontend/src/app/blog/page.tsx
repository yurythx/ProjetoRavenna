/** @jsxImportSource react */
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { backendFetch } from "@/lib/backend";
import { BlogHeaderActions } from "@/app/blog/blog-header-actions";

export default async function BlogPage(props: any) {
  const searchParams = await props.searchParams;
  const q = searchParams?.q || "";
  const category = searchParams?.category || "";
  
  const [postsRes, catsRes] = await Promise.all([
    backendFetch<any>(`/api/v1/blog/public/posts/?search=${q}&category=${category}`, { method: "GET" }),
    backendFetch<any>("/api/v1/blog/public/categories/", { method: "GET" })
  ]);

  const posts = postsRes.ok ? postsRes.data.results : [];
  const categories = catsRes.ok ? (Array.isArray(catsRes.data) ? catsRes.data : []) : [];

  return (
    <div className="relative min-h-screen">
      <section className="relative py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-bold text-white">Blog</h1>
              <p className="text-gray-400 mt-2">Noticias e atualizações</p>
            </div>
            <BlogHeaderActions />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12 grid grid-cols-12 gap-12">
        <div className="col-span-8">
          <div className="grid gap-6 sm:grid-cols-2">
            {Array.isArray(posts) && posts.map((p: any) => (
              <div key={p.id} className="bg-white/5 p-4 rounded-xl">
                <h3 className="text-lg text-white font-semibold">{p.title}</h3>
                <Link href={`/blog/${p.slug}`} className="text-blue-400 text-xs mt-2 block">Ver mais</Link>
              </div>
            ))}
          </div>
        </div>
        <aside className="col-span-4">
          <div className="bg-white/5 p-6 rounded-xl">
            <h3 className="text-white font-bold mb-4">Categorias</h3>
            <div className="flex flex-col gap-2">
              {Array.isArray(categories) && categories.map((c: any) => (
                <Link key={c.id} href={`/blog?category=${c.slug}`} className="text-gray-400 hover:text-white">
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
