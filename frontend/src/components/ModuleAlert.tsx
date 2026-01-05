'use client';
import { AlertTriangle } from 'lucide-react';
import { useModules } from '@/contexts/ModuleContext';

export function ModuleAlert() {
  const { disabled } = useModules();
  const first = Object.entries(disabled).find(([, v]) => v);
  if (!first) return null;
  const [name] = first;
  return (
    <div className="w-full bg-yellow-100 text-yellow-800">
      <div className="max-w-5xl mx-auto px-4 py-2 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" />
        <span>Módulo "{name}" desativado administrativamente.</span>
      </div>
    </div>
  );
}

