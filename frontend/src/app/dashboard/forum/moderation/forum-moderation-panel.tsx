"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDebounce } from "@/hooks/use-debounce";
import { api } from "@/lib/axios";
import { sanitizeRichTextHtml } from "@/lib/sanitize-html";

type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
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

type ReplyAuthor = {
  id: string;
  username: string;
  display_name?: string | null;
};

type ReplyListItem = {
  id: string;
  content: string;
  author: ReplyAuthor | null;
  topic: string;
  is_solution: boolean;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
};

export function ForumModerationPanel() {
  const [query, setQuery] = React.useState("");
  const debounced = useDebounce(query, 300);
  const queryClient = useQueryClient();
  const [selectedTopicSlug, setSelectedTopicSlug] = React.useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["forum-moderation-topics", debounced],
    queryFn: async ({ signal }) => {
      const params: Record<string, string | number> = { page: 1, page_size: 50, ordering: "-created_at" };
      if (debounced.trim()) params.search = debounced.trim();
      const res = await api.get<Paginated<TopicListItem>>("/api/forum/topics/", { params, signal });
      return res.data;
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ slug, action }: { slug: string; action: "pin" | "unpin" | "close" | "open" | "archive" }) => {
      const safeSlug = encodeURIComponent(slug);
      await api.post(`/api/forum/topics/${safeSlug}/${action}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["forum-moderation-topics"] });
      await queryClient.invalidateQueries({ queryKey: ["forum:topics"] });
    },
  });

  const { data: repliesData, isLoading: isRepliesLoading } = useQuery({
    queryKey: ["forum-moderation-replies", selectedTopicSlug],
    enabled: Boolean(selectedTopicSlug),
    queryFn: async ({ signal }) => {
      const params: Record<string, string | number> = { page: 1, page_size: 200, include_hidden: 1 };
      if (selectedTopicSlug) params.topic = selectedTopicSlug;
      const res = await api.get<Paginated<ReplyListItem>>("/api/forum/replies/", { params, signal });
      return res.data;
    },
  });

  const replyActionMutation = useMutation({
    mutationFn: async ({ id, action, reason }: { id: string; action: "hide" | "unhide" | "mark-solution" | "unmark-solution"; reason?: string }) => {
      const safeId = encodeURIComponent(id);
      const url = `/api/forum/replies/${safeId}/${action}`;
      if (action === "hide") {
        await api.post(url, { reason: reason ?? "" });
        return;
      }
      await api.post(url);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["forum-moderation-replies"] });
      await queryClient.invalidateQueries({ queryKey: ["forum-moderation-topics"] });
      await queryClient.invalidateQueries({ queryKey: ["forum:topics"] });
    },
  });

  const topics = data?.results ?? [];
  const replies = repliesData?.results ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar tópicos..." className="max-w-xl" />
        </div>
        <div className="flex items-center gap-2 text-sm text-foreground/70">
          <Badge variant="secondary">{isLoading ? "Carregando..." : `${topics.length} itens`}</Badge>
          <Button asChild variant="outline">
            <Link href="/forum">Abrir fórum</Link>
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-foreground/10 bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tópico</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-sm text-foreground/70">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : topics.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-sm text-foreground/70">
                  Nenhum tópico encontrado.
                </TableCell>
              </TableRow>
            ) : (
              topics.map((t) => {
                const topicHref = `/forum/t/${encodeURIComponent(t.slug)}`;
                const categoryHref = `/forum/c/${encodeURIComponent(t.category)}`;
                const status = (t.status || "").toLowerCase();
                const statusLabel = status === "archived" ? "Arquivado" : status === "open" ? "Aberto" : status || "—";
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={topicHref} className="hover:underline">
                          {t.title}
                        </Link>
                        {t.is_pinned ? <Badge variant="secondary">Fixado</Badge> : null}
                        {t.is_locked ? <Badge variant="outline">Fechado</Badge> : null}
                      </div>
                      <div className="mt-1 text-xs text-foreground/60">
                        {t.reply_count} replies · {t.view_count} views
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <Link href={categoryHref} className="text-foreground/80 hover:underline">
                        {t.category_name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">
                      <Badge variant="outline">{statusLabel}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={topicHref}>Abrir</Link>
                        </Button>

                        <Button
                          size="sm"
                          variant={selectedTopicSlug === t.slug ? "secondary" : "outline"}
                          onClick={() => setSelectedTopicSlug((cur) => (cur === t.slug ? null : t.slug))}
                        >
                          Replies
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionMutation.isPending}
                          onClick={() =>
                            actionMutation.mutate({ slug: t.slug, action: t.is_pinned ? "unpin" : "pin" })
                          }
                        >
                          {t.is_pinned ? "Desfixar" : "Fixar"}
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionMutation.isPending}
                          onClick={() =>
                            actionMutation.mutate({ slug: t.slug, action: t.is_locked ? "open" : "close" })
                          }
                        >
                          {t.is_locked ? "Abrir" : "Fechar"}
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionMutation.isPending || (t.status || "").toLowerCase() === "archived"}
                          onClick={() => {
                            const ok = window.confirm("Arquivar este tópico? Essa ação é reversível apenas via API.");
                            if (!ok) return;
                            actionMutation.mutate({ slug: t.slug, action: "archive" });
                          }}
                        >
                          Arquivar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {selectedTopicSlug ? (
        <div className="rounded-2xl border border-foreground/10 bg-background p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-medium">
              Replies do tópico: <span className="font-mono">{selectedTopicSlug}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{isRepliesLoading ? "Carregando..." : `${replies.length} itens`}</Badge>
              <Button size="sm" variant="outline" onClick={() => setSelectedTopicSlug(null)}>
                Fechar
              </Button>
            </div>
          </div>

          <div className="mt-3 overflow-hidden rounded-xl border border-foreground/10">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Autor</TableHead>
                  <TableHead>Conteúdo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isRepliesLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-sm text-foreground/70">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : replies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-sm text-foreground/70">
                      Nenhuma reply encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  replies.map((r) => {
                    const authorLabel = r.author?.display_name || r.author?.username || "—";
                    const flags = [
                      r.is_solution ? "Solução" : null,
                      r.is_hidden ? "Oculta" : null,
                    ].filter(Boolean) as string[];

                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm">{authorLabel}</TableCell>
                        <TableCell className="text-sm">
                          <div
                            className="max-w-[52rem] text-foreground/80 line-clamp-3"
                            dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(r.content) }}
                          />
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            {flags.length ? flags.map((f) => <Badge key={f} variant="outline">{f}</Badge>) : <span className="text-foreground/60">—</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={replyActionMutation.isPending}
                              onClick={() => {
                                if (!r.is_hidden) {
                                  const reason = window.prompt("Motivo para ocultar (opcional):", "") ?? "";
                                  replyActionMutation.mutate({ id: r.id, action: "hide", reason });
                                  return;
                                }
                                replyActionMutation.mutate({ id: r.id, action: "unhide" });
                              }}
                            >
                              {r.is_hidden ? "Reexibir" : "Ocultar"}
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              disabled={replyActionMutation.isPending}
                              onClick={() =>
                                replyActionMutation.mutate({ id: r.id, action: r.is_solution ? "unmark-solution" : "mark-solution" })
                              }
                            >
                              {r.is_solution ? "Desmarcar solução" : "Marcar solução"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
