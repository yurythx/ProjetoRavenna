"use client";

import Link from "next/link";

import { useAuth } from "@/components/auth-provider";

export function ForumHeaderActions({ newTopicHref }: { newTopicHref: string }) {
  const { user, isLoading } = useAuth();
  const isLoggedIn = Boolean(user) && !isLoading;

  return (
    <>
      {isLoggedIn ? (
        <Link href={newTopicHref} className="text-sm font-medium text-foreground hover:underline">
          Criar tópico
        </Link>
      ) : null}
    </>
  );
}

