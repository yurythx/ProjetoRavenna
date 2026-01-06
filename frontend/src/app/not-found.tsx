'use client';
import Link from 'next/link';
import { ErrorArt } from '@/components/ErrorArt';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="container-custom text-center space-y-6">
        <div className="mx-auto max-w-xl">
          <ErrorArt src="/errors/404.webp" alt="Página não encontrada" />
        </div>
        <h1 className="text-3xl font-extrabold" style={{ color: 'var(--foreground)' }}>Página não encontrada</h1>
        <p className="text-muted-foreground">O conteúdo que você procura não existe ou foi movido.</p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/" className="btn btn-primary">Voltar ao início</Link>
          <Link href="/artigos" className="btn btn-outline">Ver artigos</Link>
        </div>
      </div>
    </div>
  );
}
