'use client';

import dynamic from 'next/dynamic';
import { useTheme } from '@/contexts/ThemeContext';

const Editor = dynamic(() => import('@tinymce/tinymce-react').then((m) => m.Editor), { ssr: false });

type TinyEditorProps = {
  value: string;
  onChange: (html: string) => void;
  height?: number;
};

export function TinyEditor({ value, onChange, height = 600 }: TinyEditorProps) {
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
        statusbar: false,
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
          'undo redo | blocks | bold italic | bullist numlist | link image codesample | removeformat',
        autosave_interval: '30s',
        autosave_prefix: 'tinymce-autosave-{path}{query}-',
        autosave_retention: '20m',
        autosave_restore_when_empty: true,
        content_style: `
          body {
            background: var(--background);
            color: var(--foreground);
            font-family: var(--font-sans);
            line-height: 1.8;
            padding: 2rem max(2rem, (100% - 800px) / 2);
            font-size: 16px;
          }
          .mce-content-body { overflow-x: hidden; }
          img { max-width: 100%; height: auto; border-radius: 8px; }
          a { color: var(--accent); text-decoration: none; border-bottom: 1px solid var(--accent); }
          blockquote { border-left: 4px solid var(--accent); padding-left: 20px; font-style: italic; color: var(--muted-foreground); margin: 1.5rem 0; }
          pre, code { background: color-mix(in srgb, var(--muted) 70%, transparent); border-radius: 8px; padding: 0.2em 0.4em; }
          h1, h2, h3 { font-weight: 700; margin-top: 2rem; margin-bottom: 1rem; }
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
