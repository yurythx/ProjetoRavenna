"use client";

import { Suspense } from "react";

import { ModuleGuard } from "@/components/module-guard";
import { BlogCommentModeration } from "@/features/blog/comment-moderation";

export default function BlogCommentsModerationPage() {
  return (
    <ModuleGuard>
      <Suspense fallback={null}>
        <BlogCommentModeration />
      </Suspense>
    </ModuleGuard>
  );
}

