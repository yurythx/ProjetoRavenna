import Link from "next/link";

export default function ForumNotFound() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link href="/forum" className="text-sm font-medium text-foreground hover:underline">
        Voltar
      </Link>
      <div className="mt-6 rounded-2xl border border-foreground/10 bg-background p-5 text-sm text-foreground/80">
        Conteúdo não encontrado.
      </div>
    </div>
  );
}

