'use client';

import dynamic from 'next/dynamic';
import { useTheme } from '@/contexts/ThemeContext';

const Editor = dynamic(() => import('@tinymce/tinymce-react').then((m) => m.Editor), { ssr: false });

type TinyEditorProps = {
  value: string;
  onChange: (html: string) => void;
  height?: number;
};

export function TinyEditor({ value, onChange, height = 400 }: TinyEditorProps) {
  const { resolvedTheme } = useTheme();
  const skin = resolvedTheme === 'dark' ? 'oxide-dark' : 'oxide';
  const contentCss = resolvedTheme === 'dark' ? 'dark' : 'default';
  function getTokenFromCookie() {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(/(?:^|; )auth_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  return (
    <Editor
      tinymceScriptSrc="/tinymce/tinymce.min.js"
      value={value}
      licenseKey='gpl'
      disabled={false}
      init={{
        height,
        menubar: false,
        skin,
        content_css: contentCss,
        plugins: [
          'lists',
          'link',
          'image',
          'table',
          'code',
          'advlist',
          'codesample',
          'autosave',
        ],
        toolbar:
          'undo redo | blocks | bold italic underline | alignleft aligncenter alignright | bullist numlist | link image codesample | removeformat',
        autosave_interval: '30s',
        autosave_prefix: 'tinymce-autosave-{path}{query}-',
        autosave_retention: '20m',
        autosave_restore_when_empty: true,
        content_style: `
          body {
            background: var(--background);
            color: var(--foreground);
            font-family: var(--font-sans);
            line-height: 1.6;
          }
          a { color: var(--accent); text-decoration: underline; text-underline-offset: 2px; }
          blockquote { border-left: 4px solid var(--accent); padding-left: 12px; }
          pre, code { background: color-mix(in srgb, var(--muted) 50%, transparent); border-radius: 6px; }
        `,
        images_upload_handler: async (blobInfo) => {
          const form = new FormData();
          form.append('file', blobInfo.blob(), blobInfo.filename());
          const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/articles/uploads/`, {
            method: 'POST',
            body: form,
            headers: {
              ...(getTokenFromCookie() ? { Authorization: `Bearer ${getTokenFromCookie()}` } : {}),
            },
          });
          if (!resp.ok) {
            throw new Error('Falha no upload da imagem');
          }
          const data = await resp.json();
          return data.location;
        },
      }}
      onEditorChange={(content) => onChange(content)}
    />
  );
}
