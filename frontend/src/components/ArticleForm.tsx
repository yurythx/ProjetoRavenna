'use client';
import { useEffect, useMemo, useState, useRef } from 'react';
import Image from 'next/image';
import { components } from '@/types/api';
import { useCategories } from '@/hooks/useCategories';
import { useTags } from '@/hooks/useTags';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { useQueryClient } from '@tanstack/react-query';
import slugify from '@sindresorhus/slugify';
import { TinyEditor } from '@/components/TinyEditor';
import DOMPurify from 'dompurify';
import { X, Upload, Image as ImageIcon, Check } from 'lucide-react';

type Article = components['schemas']['Article'];
type ArticleRequest = components['schemas']['ArticleRequest'];

export function ArticleForm({ initial }: { initial?: Article }) {
  const router = useRouter();
  const { show } = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(initial?.title || '');
  const [content, setContent] = useState(initial?.content || '');
  const [category, setCategory] = useState<string>(initial?.category || '');
  const [isPublished, setIsPublished] = useState<boolean>(initial?.is_published || false);
  const [tags, setTags] = useState<string[]>(initial?.tags || []);
  const [banner, setBanner] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initial?.banner || null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);

  // Tag Search State
  const [tagSearch, setTagSearch] = useState('');
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);

  const titleLen = title.trim().length;
  const contentLen = content.trim().length;
  const slugPreview = useMemo(() => slugify(title || ''), [title]);

  const { data: cats } = useCategories();
  const { data: tgs } = useTags();

  useEffect(() => {
    if (initial) return;
    try {
      const raw = localStorage.getItem('articleDraft');
      if (!raw) return;
      const d = JSON.parse(raw || '{}');
      setTitle(d.title || '');
      setContent(d.content || '');
      setCategory(d.category || '');
      setIsPublished(!!d.is_published);
      setTags(Array.isArray(d.tags) ? d.tags : []);
    } catch { }
  }, []);

  useEffect(() => {
    const dirty =
      (initial && (title !== (initial.title || '') || content !== (initial.content || '') || category !== (initial.category || '') || isPublished !== !!initial.is_published || JSON.stringify(tags) !== JSON.stringify(initial.tags || []))) ||
      (!initial && (titleLen > 0 || contentLen > 0 || !!category || tags.length > 0 || !!banner));
    function handler(e: BeforeUnloadEvent) {
      if (!dirty || loading) return;
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [initial, title, content, category, isPublished, tags, banner, titleLen, contentLen, loading]);

  useEffect(() => {
    if (initial) return;
    try {
      const d = { title, content, category, is_published: isPublished, tags };
      localStorage.setItem('articleDraft', JSON.stringify(d));
    } catch { }
  }, [title, content, category, isPublished, tags, initial]);

  useEffect(() => {
    if (!category && cats && cats.length > 0) {
      setCategory(cats[0].id);
    }
  }, [cats]);

  useEffect(() => {
    setTitleError(titleLen < 3 ? 'Título deve ter ao menos 3 caracteres' : null);
  }, [titleLen]);

  useEffect(() => {
    setContentError(contentLen < 10 ? 'Conteúdo deve ter ao menos 10 caracteres' : null);
  }, [contentLen]);

  useEffect(() => {
    if (!banner) {
      if (initial?.banner) setPreviewUrl(initial.banner);
      setBannerError(null);
      return;
    }
    const url = URL.createObjectURL(banner);
    setPreviewUrl(url);
    const maxBytes = 5 * 1024 * 1024;
    if (banner.size > maxBytes) {
      setBannerError('Banner deve ter no máximo 5MB');
    } else {
      setBannerError(null);
    }
    return () => URL.revokeObjectURL(url);
  }, [banner, initial]);

  const payload = useMemo<ArticleRequest>(() => ({
    title,
    content: DOMPurify.sanitize(content || ''),
    category,
    is_published: isPublished,
    tags,
  }), [title, content, category, isPublished, tags]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    if (titleError || contentError || bannerError || !category) {
      setLoading(false);
      setError('Verifique os campos antes de salvar');
      return;
    }
    try {
      const form = new FormData();
      Object.entries(payload).forEach(([k, v]) => {
        if (v === undefined || v === null) return;
        if (Array.isArray(v)) {
          v.forEach((item) => form.append(k, item));
        } else {
          form.append(k, v as any);
        }
      });
      if (banner) form.append('banner', banner);
      if (!initial) {
        const { data } = await api.post('/articles/posts/', form);
        queryClient.invalidateQueries({ queryKey: ['articles'] });
        show({ type: 'success', message: 'Artigo publicado com sucesso' });
        try { localStorage.removeItem('articleDraft'); } catch { }
        router.push(`/artigos/${data.slug}`);
      } else {
        const { data } = await api.put(`/articles/posts/${initial.slug}/`, form);
        queryClient.invalidateQueries({ queryKey: ['articles'] });
        queryClient.invalidateQueries({ queryKey: ['article', initial.slug] });
        show({ type: 'success', message: 'Artigo atualizado com sucesso' });
        router.push(`/artigos/${data.slug}`);
      }
    } catch (err: any) {
      setError('Falha ao salvar');
      show({ type: 'error', message: 'Falha ao salvar artigo' });
    } finally {
      setLoading(false);
    }
  }

  function saveDraftExplicit() {
    try {
      const d = { title, content, category, is_published: isPublished, tags };
      localStorage.setItem('articleDraft', JSON.stringify(d));
      show({ type: 'success', message: 'Rascunho salvo' });
    } catch {
      show({ type: 'error', message: 'Falha ao salvar rascunho' });
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    const isMac = navigator.platform.toLowerCase().includes('mac');
    const saveCombo = (isMac && e.metaKey && e.key.toLowerCase() === 's') || (!isMac && e.ctrlKey && e.key.toLowerCase() === 's');
    if (saveCombo) {
      e.preventDefault();
      if (!loading && !titleError && !contentError && !bannerError && !!category) {
        const evt = new Event('submit', { bubbles: true, cancelable: true }) as any;
        onSubmit(evt);
      } else {
        saveDraftExplicit();
      }
    }
  }

  // Filter tags for combobox
  const filteredTags = useMemo(() => {
    if (!tgs) return [];
    const lower = tagSearch.toLowerCase();
    return tgs.filter(t => !tags.includes(t.id) && t.name.toLowerCase().includes(lower));
  }, [tgs, tagSearch, tags]);

  return (
    <form onSubmit={onSubmit} onKeyDown={onKeyDown} className="space-y-6" aria-describedby="form-status" aria-live="polite">
      {error && <div className="bg-red-50 text-red-600 p-3 rounded" id="form-status">{error}</div>}

      <div className="grid md:grid-cols-[2fr_1fr] gap-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-1">Título</label>
            <input
              id="title"
              className="input text-lg font-bold"
              placeholder="Título do Artigo"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-invalid={!!titleError}
            />
            <div className="text-xs text-gray-500 mt-1 flex justify-between">
              <span>{titleLen} caracteres</span>
              {slugPreview && <span>URL: /artigos/{slugPreview}</span>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Conteúdo</label>
            <TinyEditor value={content} onChange={(v) => setContent(v || '')} height={500} />
            <div className="text-xs text-gray-500 mt-1">{contentLen} caracteres</div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Publishing Options */}
          <div className="card p-4 space-y-4">
            <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wider">Publicação</h3>
            <div>
              <label htmlFor="category" className="block text-sm font-medium mb-1">Categoria</label>
              <select
                id="category"
                className="input w-full"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {cats?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
              />
              <span className="text-sm">Publicar imediatamente</span>
            </label>

            <div className="flex flex-col gap-2 pt-2 border-t mt-2">
              <button
                type="submit"
                disabled={loading || !!titleError || !!contentError || !!bannerError || !category}
                className="btn btn-primary w-full"
              >
                {loading ? 'Salvando…' : (initial ? 'Atualizar Artigo' : 'Publicar Artigo')}
              </button>
              {!initial && (
                <button type="button" onClick={saveDraftExplicit} className="btn btn-outline w-full">
                  Salvar Rascunho
                </button>
              )}
            </div>
          </div>

          {/* Banner Upload */}
          <div className="card p-4 space-y-4">
            <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wider">Capa do Artigo</h3>
            <div className="relative group">
              <input
                id="banner"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setBanner(e.target.files?.[0] || null)}
              />
              <label
                htmlFor="banner"
                className={`
                            block w-full aspect-video rounded-lg border-2 border-dashed cursor-pointer overflow-hidden relative
                            flex flex-col items-center justify-center transition-colors
                            ${bannerError ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-blue-500 hover:bg-gray-50'}
                        `}
              >
                {previewUrl ? (
                  <>
                    <Image
                      src={previewUrl}
                      alt="Preview"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2">
                        <Upload className="h-3 w-3" /> Alterar
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-4 text-gray-500">
                    <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <span className="text-sm">Clique para upload</span>
                  </div>
                )}
              </label>
            </div>
            {bannerError && <p className="text-xs text-red-600">{bannerError}</p>}
          </div>

          {/* Tags Combobox */}
          <div className="card p-4 space-y-4">
            <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wider">Tags</h3>
            <div className="relative">
              <input
                ref={tagInputRef}
                className="input w-full"
                placeholder="Buscar tags..."
                value={tagSearch}
                onChange={(e) => {
                  setTagSearch(e.target.value);
                  setTagMenuOpen(true);
                }}
                onFocus={() => setTagMenuOpen(true)}
                onBlur={() => setTimeout(() => setTagMenuOpen(false), 200)}
              />
              {tagMenuOpen && filteredTags.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {filteredTags.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center justify-between"
                      onClick={() => {
                        setTags([...tags, t.id]);
                        setTagSearch('');
                        tagInputRef.current?.focus();
                      }}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map(tid => {
                const tag = tgs?.find(t => t.id === tid);
                if (!tag) return null;
                return (
                  <span key={tid} className="badge badge-active flex items-center gap-1 pr-1">
                    {tag.name}
                    <button
                      type="button"
                      onClick={() => setTags(tags.filter(id => id !== tid))}
                      className="hover:bg-black/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

