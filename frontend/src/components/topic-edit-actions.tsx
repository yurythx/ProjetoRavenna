"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth-provider";
import { ForumRichEditor } from "@/components/forum-rich-editor";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { stripHtml } from "@/lib/utils";

export function TopicEditActions({
  slug,
  authorId,
  initialTitle,
  initialContent,
}: {
  slug: string;
  authorId: string | null;
  initialTitle: string;
  initialContent: string;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canEdit = useMemo(() => {
    const u = (user ?? null) as Record<string, unknown> | null;
    const isModerator = Boolean(u?.["is_forum_moderator"]);
    const myId = typeof u?.["id"] === "string" ? (u["id"] as string) : null;
    return Boolean(isModerator || (authorId && myId && authorId === myId));
  }, [user, authorId]);

  if (!canEdit) return null;

  const canSubmit = title.trim().length >= 3 && stripHtml(content).length >= 3;

  async function submit() {
    setError(null);
    setIsSubmitting(true);
    const res = await fetch(`/api/forum/topics/${encodeURIComponent(slug)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ title: title.trim(), content }),
    });
    setIsSubmitting(false);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const message =
        typeof data?.error === "string"
          ? data.error
          : typeof data?.detail === "string"
            ? data.detail
            : "Falha ao atualizar tópico.";
      setError(message);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) {
          setTitle(initialTitle);
          setContent(initialContent);
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Editar tópico</DialogTitle>
          <DialogDescription>Atualize o título e o conteúdo. O conteúdo aceita rich text.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <div className="text-sm font-semibold">Título</div>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid gap-2">
            <div className="text-sm font-semibold">Conteúdo</div>
            <ForumRichEditor content={content} onChange={setContent} disabled={isSubmitting} />
          </div>

          {error ? <div className="text-sm text-red-600">{error}</div> : null}

          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" type="button" disabled={isSubmitting} onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={isSubmitting || !canSubmit} onClick={submit}>
              {isSubmitting ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

