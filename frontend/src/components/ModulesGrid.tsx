'use client';

import Link from 'next/link';
import { useCategories } from '@/hooks/useCategories';
import { BookOpen, Layers, Users } from 'lucide-react';
import { useModules } from '@/contexts/ModuleContext';

export function ModulesGrid() {
  const { data: cats, isLoading, error } = useCategories();
  const { disabled } = useModules();
  const articlesActive = !disabled['articles'] && !!cats && !error;
  return (
    <div className="grid md:grid-cols-3 gap-8">
      <div className="card p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--accent)', color: 'white' }}>
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-semibold">Artigos</p>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              {isLoading ? 'Verificando…' : articlesActive ? 'Ativo' : 'Indisponível'}
            </p>
          </div>
        </div>
        <p style={{ color: 'var(--muted-foreground)' }}>
          Módulo de publicação com editor rico, categorias e tags.
        </p>
        {articlesActive ? (
          <Link href="/artigos" className="btn btn-primary">Abrir módulo</Link>
        ) : (
          <button className="btn btn-outline" disabled>Indisponível</button>
        )}
      </div>
      <div className="card p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--accent)', color: 'white' }}>
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-semibold">Entidades</p>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Em breve</p>
          </div>
        </div>
        <p style={{ color: 'var(--muted-foreground)' }}>
          Gestão de entidades e relacionamentos.
        </p>
        <button className="btn btn-outline" disabled>Indisponível</button>
      </div>
      <div className="card p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--accent)', color: 'white' }}>
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-semibold">Contas</p>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Em breve</p>
          </div>
        </div>
        <p style={{ color: 'var(--muted-foreground)' }}>
          Usuários, perfis e permissões.
        </p>
        <button className="btn btn-outline" disabled>Indisponível</button>
      </div>
    </div>
  );
}

