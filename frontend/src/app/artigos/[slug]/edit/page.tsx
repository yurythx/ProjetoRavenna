'use client';
import { useParams } from 'next/navigation';
import { useArticle } from '@/hooks/useArticle';
import { useProfile } from '@/hooks/useProfile';
import { ArticleForm } from '@/components/ArticleForm';
import { Lock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function EditArticlePage() {
  const params = useParams<{ slug: string }>();
  const { data, isLoading, error } = useArticle(params.slug);
  const { profile } = useProfile();

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
  );

  if (error || !data) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">Artigo não encontrado</h2>
      <Link href="/artigos" className="text-primary hover:underline">Voltar para artigos</Link>
    </div>
  );

  const canEdit = data.can_edit || (profile?.id && data.author && profile.id === data.author);

  if (!canEdit) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4 animate-fade-in">
      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6">
        <Lock className="w-8 h-8 text-red-600 dark:text-red-400" />
      </div>
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Acesso Negado</h1>
      <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md">
        Você não tem permissão para editar este artigo. Apenas o autor ou administradores podem realizar alterações.
      </p>
      <Link
        href={`/artigos/${params.slug}`}
        className="btn btn-outline flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar para o artigo
      </Link>
    </div>
  );

  return (
    <div className="container-custom py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link
          href={`/artigos/${params.slug}`}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          title="Voltar"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Editar Artigo</h1>
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8">
        <ArticleForm initial={data as any} />
      </div>
    </div>
  );
}

