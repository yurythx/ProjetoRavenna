'use client';
export default function FavoritosClient() {
  return (
    <div className="container-custom py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Favoritos</h1>
        <div className="flex gap-2">
          <button className="badge badge-accent">Todos</button>
          <button className="badge badge-outline">Artigos</button>
          <button className="badge badge-outline">Tags</button>
        </div>
      </div>
      <div className="p-6 rounded-2xl bg-muted/30 border border-border text-center text-muted-foreground">
        Em breve
      </div>
    </div>
  );
}
