'use client';
import { AlertTriangle } from 'lucide-react';
import { useModules } from '@/contexts/ModuleContext';

export function ModuleAlert() {
  const { disabled } = useModules();
  const first = Object.entries(disabled).find(([, v]) => v);
  if (!first) return null;
  const [name] = first;

  return (
    <div className="fixed top-18 left-1/2 -translate-x-1/2 z-[45] w-full max-w-xl px-4 animate-slide-down pointer-events-none">
      <div className="bg-white/10 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-full py-2 px-4 shadow-2xl flex items-center justify-center gap-3 text-sm font-medium pointer-events-auto">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
          <AlertTriangle className="w-4 h-4 text-yellow-500" />
        </div>
        <span className="text-foreground/90">
          O módulo <span className="text-yellow-500 font-bold">"{name}"</span> está temporariamente desativado.
        </span>
      </div>
    </div>
  );
}

