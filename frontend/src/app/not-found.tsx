import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-foreground/40">Erro 404</p>
      <h1 className="mt-3 text-3xl font-semibold text-foreground">Página não encontrada</h1>
      <p className="mt-2 max-w-sm text-sm text-foreground/60">
        A página que você está procurando não existe ou foi movida.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-foreground px-5 py-2 text-sm text-background hover:opacity-90"
      >
        Voltar ao início
      </Link>
    </div>
  );
}
