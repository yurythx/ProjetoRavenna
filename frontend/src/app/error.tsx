'use client';

import { useEffect } from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const t = useTranslations('Errors');
    useEffect(() => {
        console.error('Application error:', error);
    }, [error]);

    return (
        <div
            className="min-h-screen flex items-center justify-center p-6"
            style={{ background: 'var(--background)' }}
        >
            <div
                className="max-w-md w-full text-center p-8 rounded-xl shadow-lg space-y-6"
                style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border)'
                }}
                role="alert"
                aria-live="assertive"
            >
                <div
                    className="w-20 h-20 mx-auto rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(239, 68, 68, 0.1)' }}
                >
                    <AlertTriangle className="w-10 h-10 text-red-500" aria-hidden="true" />
                </div>

                <div>
                    <h1 className="text-3xl font-bold mb-3" style={{ color: 'var(--foreground)' }}>
                        {t('somethingWentWrong')}
                    </h1>
                    <p className="text-base mb-2" style={{ color: 'var(--muted-foreground)' }}>
                        {t('unexpectedError')}
                    </p>
                    {error.message && (
                        <p className="text-sm px-4 py-2 rounded-lg mt-4" style={{
                            background: 'var(--muted)',
                            color: 'var(--muted-foreground)',
                            fontFamily: 'monospace'
                        }}>
                            {error.message}
                        </p>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={reset}
                        className="btn btn-primary flex items-center justify-center gap-2"
                        aria-label={t('tryAgain')}
                    >
                        <RefreshCw className="w-4 h-4" aria-hidden="true" />
                        {t('tryAgain')}
                    </button>
                    <a
                        href="/"
                        className="btn btn-outline flex items-center justify-center gap-2"
                    >
                        <Home className="w-4 h-4" aria-hidden="true" />
                        {t('backToHome')}
                    </a>
                </div>
            </div>
        </div>
    );
}
