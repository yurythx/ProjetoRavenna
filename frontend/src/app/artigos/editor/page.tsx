'use client';
import { useState } from 'react';
import { TinyEditor } from '@/components/TinyEditor';
import DOMPurify from 'dompurify';

export default function ArtigosEditorDemoPage() {
  const [content, setContent] = useState<string>('<p>Escreva seu artigo aqui...</p>');

  const sanitize = (html: string) => {
    if (typeof window === 'undefined') return html;
    return DOMPurify.sanitize(html);
  };

  return (
    <div className="container-custom py-8">
      <h1 className="text-2xl font-bold mb-4">Editor de Artigos (TinyMCE)</h1>
      <TinyEditor value={content} onChange={setContent} />
      <div className="mt-6 space-y-2">
        <h2 className="text-lg font-semibold">Prévia</h2>
        <article className="prose" dangerouslySetInnerHTML={{ __html: sanitize(content) }} />
      </div>
    </div>
  );
}

