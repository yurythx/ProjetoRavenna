"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type MediaItem = { id: string; url: string; created_at: string };

export function MediaDialog({
  onSelect,
  trigger,
}: {
  onSelect: (url: string) => void;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSelect = useMemo(() => url.trim().length > 5, [url]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setError(null);
      setIsLoading(true);
      const res = await fetch("/api/blog/media/images", { method: "GET", headers: { Accept: "application/json" } });
      setIsLoading(false);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError("Não foi possível carregar a galeria.");
        return;
      }
      const results = Array.isArray(data?.results) ? (data.results as MediaItem[]) : Array.isArray(data) ? (data as MediaItem[]) : [];
      setItems(results);
    })();
  }, [open]);

  async function upload(file: File) {
    setError(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/blog/media/images", { method: "POST", body: form });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(typeof data?.error === "string" ? data.error : "Falha ao enviar imagem.");
      return;
    }
    const mediaUrl = typeof data?.url === "string" ? data.url : null;
    if (mediaUrl) {
      onSelect(mediaUrl);
      setOpen(false);
      setUrl("");
      return;
    }
    setError("Upload concluído, mas não retornou URL.");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Mídia</DialogTitle>
          <DialogDescription>Envie ou selecione uma imagem para inserir no conteúdo.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <div className="text-sm font-semibold">URL</div>
            <div className="flex gap-2">
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
              <Button
                type="button"
                disabled={!canSelect}
                onClick={() => {
                  onSelect(url.trim());
                  setOpen(false);
                  setUrl("");
                }}
              >
                Inserir
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <div className="text-sm font-semibold">Upload</div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f);
              }}
            />
          </div>

          {error ? <div className="text-sm text-red-600">{error}</div> : null}

          <div className="grid gap-2">
            <div className="text-sm font-semibold">Galeria</div>
            {isLoading ? <div className="text-sm text-muted-foreground">Carregando...</div> : null}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {items.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => {
                    onSelect(it.url);
                    setOpen(false);
                    setUrl("");
                  }}
                  className="overflow-hidden rounded-xl border border-border bg-background hover:bg-muted/30"
                >
                  <Image
                    src={it.url}
                    alt=""
                    width={400}
                    height={280}
                    sizes="(min-width: 640px) 25vw, 50vw"
                    className="h-28 w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
