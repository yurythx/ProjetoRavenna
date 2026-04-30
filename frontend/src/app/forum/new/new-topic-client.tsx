"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { ForumRichEditor } from "@/components/forum-rich-editor";
import { slugify, stripHtml } from "@/lib/utils";

type ForumCategory = {
  id: string;
  name: string;
  slug: string;
};

export function NewTopicClient({ initialCategorySlug }: { initialCategorySlug: string }) {
  const router = useRouter();
  const { user } = useAuth();

  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [categorySlug, setCategorySlug] = useState(initialCategorySlug);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/forum/categories?page=1&page_size=200`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      const results = (data?.results ?? []) as ForumCategory[];
      setCategories(results);
      setCategorySlug((prev) => prev || results[0]?.slug || "");
    })();
  }, []);

  const isGameUser = (() => {
    const u = (user ?? null) as Record<string, unknown> | null;
    const isAdmin = Boolean(u?.["is_admin"]) || Boolean(u?.["is_staff"]) || Boolean(u?.["is_superuser"]);
    const isPlayer = Boolean(u?.["is_player"]);
    const isVerified = Boolean(u?.["is_verified"]);
    const isActive = u?.["is_active"] === undefined ? true : Boolean(u?.["is_active"]);
    const isBanned = Boolean(u?.["is_banned"]);
    if (isAdmin) return isActive && !isBanned;
    return isPlayer && isVerified && isActive && !isBanned;
  })();

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-10">
        <h1 className="text-2xl font-semibold text-foreground">Criar tópico</h1>
        <div className="mt-4 text-sm text-foreground/80">Entre para criar um tópico.</div>
        <div className="mt-6">
          <Link href="/login" className="text-sm font-medium text-foreground hover:underline">
            Entrar
          </Link>
        </div>
      </div>
    );
  }
  if (!isGameUser) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-10">
        <h1 className="text-2xl font-semibold text-foreground">Criar tópico</h1>
        <div className="mt-4 text-sm text-foreground/80">Sua conta precisa estar ativa para criar tópicos.</div>
        <div className="mt-6">
          <Link href="/me" className="text-sm font-medium text-foreground hover:underline">
            Ver perfil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="flex items-center justify-between gap-6">
        <h1 className="text-2xl font-semibold text-foreground">Criar tópico</h1>
        <Link href="/forum" className="text-sm font-medium text-foreground hover:underline">
          Voltar
        </Link>
      </div>

      <form
        className="mt-6 flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          const categoryId = categories.find((c) => c.slug === categorySlug)?.id;
          if (!categoryId) {
            setError("Selecione uma categoria válida.");
            return;
          }
          const slug = slugify(title).slice(0, 80);
          if (!slug) {
            setError("Título inválido para gerar slug.");
            return;
          }
          if (stripHtml(content).length < 3) {
            setError("Conteúdo muito curto.");
            return;
          }
          setIsSubmitting(true);
          const res = await fetch("/api/forum/topics", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ category: categoryId, title, slug, content }),
          });
          setIsSubmitting(false);
          const data = await res.json().catch(() => null);
          if (!res.ok) {
            const message =
              typeof data?.error === "string"
                ? data.error
                : typeof data?.detail === "string"
                  ? data.detail
                  : "Falha ao criar tópico.";
            setError(message);
            return;
          }
          if (typeof data?.slug === "string" && data.slug.length > 0) {
            router.push(`/forum/t/${data.slug}`);
            return;
          }
          router.push(`/forum/c/${categorySlug}`);
        }}
      >
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">Categoria</span>
          <select
            value={categorySlug}
            onChange={(e) => setCategorySlug(e.target.value)}
            className="h-11 rounded-xl border border-foreground/15 bg-background px-3 text-sm text-foreground"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">Título</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="h-11 rounded-xl border border-foreground/15 bg-background px-3 text-foreground"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground">Conteúdo</span>
          <ForumRichEditor content={content} onChange={setContent} disabled={isSubmitting} />
        </label>

        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="h-11 rounded-xl bg-foreground px-4 text-sm font-medium text-background disabled:opacity-60"
        >
          {isSubmitting ? "Criando..." : "Criar"}
        </button>
      </form>
    </div>
  );
}
