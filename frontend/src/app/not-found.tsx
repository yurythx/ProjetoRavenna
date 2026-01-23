'use client';
import Link from 'next/link';
import { ErrorArt } from '@/components/ErrorArt';
import { useTranslations } from 'next-intl';

export default function NotFound() {
  const t = useTranslations('Errors');
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="container-custom text-center space-y-6">
        <div className="mx-auto max-w-xl flex items-center justify-center h-48 bg-muted/20 rounded-2xl border border-dashed border-border">
          <span className="text-6xl animate-bounce">🔍</span>
        </div>
        <h1 className="text-3xl font-extrabold" style={{ color: 'var(--foreground)' }}>{t('notFoundTitle')}</h1>
        <p className="text-muted-foreground">{t('notFoundDesc')}</p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/" className="btn btn-primary">{t('backToHome')}</Link>
          <Link href="/artigos" className="btn btn-outline">{t('viewArticles')}</Link>
        </div>
      </div>
    </div>
  );
}
