"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function PreviewDialog({
  slug,
  href,
  trigger,
}: {
  slug: string;
  href?: string;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const targetHref = useMemo(() => href ?? `/dashboard/blog/${encodeURIComponent(slug)}/preview`, [href, slug]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? <Button variant="outline">Preview</Button>}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Preview</DialogTitle>
          <DialogDescription>Abra a prévia do artigo em uma nova aba.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Fechar
          </Button>
          <Button asChild>
            <Link href={targetHref} target="_blank" rel="noreferrer">
              Abrir
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
