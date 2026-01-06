'use client';
import Link from 'next/link';
import { ErrorArt } from '@/components/ErrorArt';

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="container-custom text-center space-y-6">
            <div className="mx-auto max-w-xl">
              <ErrorArt src="/errors/500.webp" alt="Erro interno" />
            </div>
            <h1 className="text-3xl font-extrabold" style={{ color: 'var(--foreground)' }}>Algo deu errado</h1>
            <p className="text-muted-foreground">Ocorreu um erro inesperado ao carregar esta página.</p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={reset} className="btn btn-primary">Tentar novamente</button>
              <Link href="/" className="btn btn-outline">Voltar ao início</Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
