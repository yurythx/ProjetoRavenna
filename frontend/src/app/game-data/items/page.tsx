import Link from "next/link";

export default function GameDataItemsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-foreground">Itens</h1>
        <p className="text-sm text-foreground/80">
          Esta página vai consumir os templates públicos em{" "}
          <span className="font-medium">/api/game-data/items</span>.
        </p>
      </div>

      <div className="mt-6 flex gap-3">
        <Link href="/" className="text-sm font-medium text-foreground hover:underline">
          Voltar
        </Link>
      </div>
    </div>
  );
}

