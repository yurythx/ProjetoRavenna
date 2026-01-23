'use client';

import Link from 'next/link';
import { useCategories } from '@/hooks/useCategories';
import { BookOpen, Layers, Users } from 'lucide-react';
import { useModules } from '@/contexts/ModuleContext';
import { useTranslations } from 'next-intl';

export function ModulesGrid() {
  const t = useTranslations('Modules');
  const { data: cats, isLoading, error } = useCategories();
  const { disabled } = useModules();
  const articlesActive = !disabled['articles'] && !!cats && !error;

  return (
    <div className="grid md:grid-cols-3 gap-8">
      {/* Articles Module */}
      <div className="card p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--accent)', color: 'white' }}>
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-semibold">{t('articles')}</p>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              {isLoading ? t('statusChecking') : articlesActive ? t('statusActive') : t('statusUnavailable')}
            </p>
          </div>
        </div>
        <p style={{ color: 'var(--muted-foreground)' }}>
          {t('articlesDesc')}
        </p>
        {articlesActive ? (
          <Link href="/artigos" className="btn btn-primary">{t('openModule')}</Link>
        ) : (
          <button className="btn btn-outline" disabled>{t('statusUnavailable')}</button>
        )}
      </div>

      {/* Entities Module */}
      <div className="card p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--accent)', color: 'white' }}>
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-semibold">{t('entities')}</p>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{t('statusComingSoon')}</p>
          </div>
        </div>
        <p style={{ color: 'var(--muted-foreground)' }}>
          {t('entitiesDesc')}
        </p>
        <button className="btn btn-outline" disabled>{t('statusUnavailable')}</button>
      </div>

      {/* Accounts Module */}
      <div className="card p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--accent)', color: 'white' }}>
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-semibold">{t('accounts')}</p>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{t('statusComingSoon')}</p>
          </div>
        </div>
        <p style={{ color: 'var(--muted-foreground)' }}>
          {t('accountsDesc')}
        </p>
        <button className="btn btn-outline" disabled>{t('statusUnavailable')}</button>
      </div>
    </div>
  );
}

