'use client';
import { useParams } from 'next/navigation';
import { useArticle } from '@/hooks/useArticle';
import { ArticleForm } from '@/components/ArticleForm';

export default function EditArticlePage() {
  const params = useParams<{ slug: string }>();
  const { data, isLoading, error } = useArticle(params.slug);
  if (isLoading) return <p>Carregando…</p>;
  if (error || !data) return <p>Artigo não encontrado</p>;
  if (!data.can_edit) return <p>Sem permissão para editar este artigo.</p>;
  return (
    <div className="max-w-3xl mx-auto py-6">
      <h1 className="text-2xl font-semibold mb-4">Editar Artigo</h1>
      <ArticleForm initial={data as any} />
    </div>
  );
}

