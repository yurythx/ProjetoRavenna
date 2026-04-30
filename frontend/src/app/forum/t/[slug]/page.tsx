import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { HiddenRepliesPanel } from "@/components/hidden-replies-panel";
import { ReplyComposer } from "@/components/reply-composer";
import { ReplyEditActions } from "@/components/reply-edit-actions";
import { ReplyModerationActions } from "@/components/reply-moderation-actions";
import { ReplyReactions } from "@/components/reply-reactions";
import { TopicEditActions } from "@/components/topic-edit-actions";
import { TopicModerationActions } from "@/components/topic-moderation-actions";
import { TopicReactions } from "@/components/topic-reactions";
import { backendFetch } from "@/lib/backend";
import { sanitizeRichTextHtml } from "@/lib/sanitize-html";
import { stripHtml } from "@/lib/utils";

type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

type TopicDetail = {
  id: string;
  title: string;
  slug: string;
  content: string;
  reply_count: number;
  view_count: number;
  status: string;
  is_pinned: boolean;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  author: { id: string; username: string; display_name: string };
  category: { id: string; name: string; slug: string };
};

type ReplyListItem = {
  id: string;
  content: string;
  author: { id: string; username: string; display_name: string };
  is_solution: boolean;
  is_hidden: boolean;
  reactions: Record<string, number>;
  created_at: string;
  updated_at: string;
};

type ReactionSummary = Record<string, number>;

function getLastPage(count: number, pageSize: number) {
  return Math.max(1, Math.ceil(count / pageSize));
}

function makeDescription(text: string) {
  const s = stripHtml(text).trim().replace(/\s+/g, " ");
  if (!s) return "Discussão no fórum do Projeto Ravenna.";
  return s.length > 160 ? `${s.slice(0, 157)}...` : s;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const res = await backendFetch<TopicDetail>(`/api/forum/public/topics/${encodeURIComponent(slug)}/`, {
    method: "GET",
    cache: "force-cache",
    next: { revalidate: 30, tags: ["forum:topics"] },
  });
  const canonical = `/forum/t/${encodeURIComponent(slug)}`;
  if (!res.ok) return { title: "Tópico | Fórum | Projeto Ravenna", alternates: { canonical } };

  const topic = res.data;
  const title = `${topic.title} | Fórum | Projeto Ravenna`;
  const description = makeDescription(topic.content);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, type: "article" },
    twitter: { card: "summary", title, description },
  };
}

function parsePositiveInt(value: unknown) {
  if (typeof value !== "string") return null;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export default async function ForumTopicPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string | string[] | undefined }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const topicRes = await backendFetch<TopicDetail>(`/api/forum/public/topics/${encodeURIComponent(slug)}/`, {
    method: "GET",
    cache: "force-cache",
    next: { revalidate: 30, tags: ["forum:topics"] },
  });

  if (!topicRes.ok) {
    if (topicRes.error.status === 404) notFound();
    throw new Error("Falha ao carregar o tópico.");
  }

  const topic = topicRes.data;
  const pageSize = 20;
  const requestedPage = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const lastPage = getLastPage(topic.reply_count, pageSize);
  const currentPageRaw = parsePositiveInt(requestedPage) ?? lastPage;
  const currentPage = Math.min(Math.max(1, currentPageRaw), lastPage);

  const repliesRes = await backendFetch<Paginated<ReplyListItem>>(
    `/api/forum/public/replies/?topic=${encodeURIComponent(topic.slug)}&page=${currentPage}&page_size=${pageSize}`,
    { method: "GET", cache: "no-store" }
  );
  const replies = repliesRes.ok ? repliesRes.data.results : [];

  const reactionsRes = await backendFetch<ReactionSummary>(`/api/forum/public/topics/${encodeURIComponent(topic.slug)}/reactions/`, {
    method: "GET",
    cache: "no-store",
  });
  const reactions = reactionsRes.ok ? reactionsRes.data : {};

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Link href={`/forum/c/${topic.category.slug}`} className="text-sm font-medium text-foreground hover:underline">
            Categoria
          </Link>
          <Link href="/forum" className="text-sm font-medium text-foreground hover:underline">
            Voltar
          </Link>
        </div>
        <div className="text-xs text-foreground/60">
          {topic.reply_count} replies · {topic.view_count} views
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-foreground/10 bg-background p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="text-xs font-medium text-foreground/70">{topic.author.display_name || topic.author.username}</div>
          <TopicEditActions slug={topic.slug} authorId={topic.author?.id ?? null} initialTitle={topic.title} initialContent={topic.content} />
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">
          {topic.is_pinned ? "[Fixado] " : ""}
          {topic.title}
        </h1>
        <div
          className="prose prose-sm sm:prose-base dark:prose-invert mt-4 max-w-none"
          dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(topic.content) }}
        />
      </div>

      <TopicReactions topicId={topic.id} summary={reactions} />

      <TopicModerationActions slug={topic.slug} isPinned={topic.is_pinned} isLocked={topic.is_locked} status={topic.status} />

      <HiddenRepliesPanel topicSlug={topic.slug} />

      <div className="mt-6 grid gap-3">
        {repliesRes.ok ? null : (
          <div className="rounded-2xl border border-foreground/10 bg-background p-5 text-sm text-foreground/80">
            Não foi possível carregar as respostas.
          </div>
        )}
        {replies.map((r) => (
          <div key={r.id} className="rounded-2xl border border-foreground/10 bg-background p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="text-xs font-medium text-foreground/70">
                {r.author.display_name || r.author.username}
                {r.is_solution ? " · solução" : ""}
                {r.is_hidden ? " · oculto" : ""}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-xs text-foreground/60">{new Date(r.created_at).toLocaleString("pt-BR")}</div>
                <ReplyEditActions replyId={r.id} authorId={r.author?.id ?? null} initialContent={r.content} />
              </div>
            </div>
            <div
              className="prose prose-sm sm:prose-base dark:prose-invert mt-3 max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(r.content) }}
            />
            <ReplyReactions replyId={r.id} summary={r.reactions ?? {}} />
            <ReplyModerationActions replyId={r.id} isSolution={r.is_solution} isHidden={r.is_hidden} />
          </div>
        ))}
        {repliesRes.ok && replies.length === 0 ? (
          <div className="rounded-2xl border border-foreground/10 bg-background p-5 text-sm text-foreground/80">
            Nenhuma resposta ainda.
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex items-center justify-between gap-4 text-sm">
        <div className="text-foreground/70">
          Página {Math.min(currentPage, lastPage)} de {lastPage}
        </div>
        <div className="flex items-center gap-4">
          {currentPage > 1 ? (
            <Link href={`/forum/t/${topic.slug}?page=${currentPage - 1}`} className="font-medium text-foreground hover:underline">
              Anterior
            </Link>
          ) : (
            <span className="text-foreground/40">Anterior</span>
          )}
          {currentPage < lastPage ? (
            <Link href={`/forum/t/${topic.slug}?page=${currentPage + 1}`} className="font-medium text-foreground hover:underline">
              Próxima
            </Link>
          ) : (
            <span className="text-foreground/40">Próxima</span>
          )}
        </div>
      </div>

      <div className="mt-8">
        <ReplyComposer topicId={topic.id} disabled={topic.is_locked} />
      </div>
    </div>
  );
}
