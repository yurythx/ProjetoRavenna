"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth-provider";
import { ForumRichEditor } from "@/components/forum-rich-editor";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { stripHtml } from "@/lib/utils";

export function ReplyEditActions({
  replyId,
  authorId,
  initialContent,
}: {
  replyId: string;
  authorId: string | null;
  initialContent: string;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
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

  const canSubmit = stripHtml(content).length >= 3;

  async function submit() {
    setError(null);
    setIsSubmitting(true);
    const res = await fetch(`/api/forum/replies/${encodeURIComponent(replyId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ content }),
    });
    setIsSubmitting(false);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const message =
        typeof data?.error === "string"
          ? data.error
          : typeof data?.detail === "string"
            ? data.detail
            : "Falha ao atualizar reply.";
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
          <DialogTitle>Editar reply</DialogTitle>
          <DialogDescription>Atualize o conteúdo. Rich text habilitado.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <ForumRichEditor content={content} onChange={setContent} disabled={isSubmitting} />
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

