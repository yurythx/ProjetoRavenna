'use client';
import { useAuth } from '@/contexts/AuthContext';
import { ArticleForm } from '@/components/ArticleForm';

export default function NewArticlePage() {
  const { token } = useAuth();
  if (!token) return <p>Necessário autenticação para criar artigo.</p>;
  return (
    <div className="max-w-3xl mx-auto py-6">
      <h1 className="text-2xl font-semibold mb-4">Novo Artigo</h1>
      <ArticleForm />
    </div>
  );
}

