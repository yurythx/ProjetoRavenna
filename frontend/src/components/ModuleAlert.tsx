'use client';
import { AlertTriangle } from 'lucide-react';
import { useModules } from '@/contexts/ModuleContext';
import { useTranslations } from 'next-intl';

export function ModuleAlert() {
  const t = useTranslations('Modules');
  const { disabled } = useModules();
  const first = Object.entries(disabled).find(([, v]) => v);
  if (!first) return null;
  const [name] = first;

  return (
    <div className="fixed top-18 left-1/2 -translate-x-1/2 z-[45] w-full max-w-xl px-4 animate-slide-down pointer-events-none">
      <div className="bg-card backdrop-blur-md border border-border rounded-full py-2 px-4 shadow-2xl flex items-center justify-center gap-3 text-sm font-medium pointer-events-auto">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <AlertTriangle className="w-4 h-4 text-[var(--accent)]" />
        </div>
        <span className="text-foreground">
          {t('moduleDisabledAlert', { name })}
        </span>
      </div>
    </div>
  );
}

