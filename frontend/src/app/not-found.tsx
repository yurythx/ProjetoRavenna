import Link from 'next/link';
import { Home, SearchX } from 'lucide-react';

export default function NotFound() {
    return (
        <div
            className="min-h-screen flex items-center justify-center p-6"
            style={{ background: 'var(--background)' }}
        >
            <div className="max-w-md w-full text-center space-y-6">
                <div
                    className="w-24 h-24 mx-auto rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(var(--django-green-rgb, 68,183,139), 0.1)' }}
                >
                    <SearchX
                        className="w-12 h-12"
                        style={{ color: 'var(--django-green-primary)' }}
                        aria-hidden="true"
                    />
                </div>

                <div>
                    <h1
                        className="text-6xl font-bold mb-2"
                        style={{ color: 'var(--django-green-primary)' }}
                    >
                        404
                    </h1>
                    <h2 className="text-2xl font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
                        Página não encontrada
                    </h2>
                    <p className="text-base" style={{ color: 'var(--muted-foreground)' }}>
                        A página que você está procurando não existe ou foi movida.
                    </p>
                </div>

                <Link
                    href="/"
                    className="btn btn-primary flex items-center justify-center gap-2 mx-auto max-w-xs"
                >
                    <Home className="w-4 h-4" aria-hidden="true" />
                    Voltar ao Início
                </Link>
            </div>
        </div>
    );
}
