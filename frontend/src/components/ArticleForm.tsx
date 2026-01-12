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
import { SuccessDialog } from './SuccessDialog';

type Article = components['schemas']['Article'];
type ArticleRequest = components['schemas']['ArticleRequest'];

export function ArticleForm({ initial }: { initial?: Article }) {
  const router = useRouter();
  const { show } = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(initial?.title || '');
  const [excerpt, setExcerpt] = useState(initial?.excerpt || '');
  const [content, setContent] = useState(initial?.content || '');
  const [category, setCategory] = useState<string>(initial?.category || '');
  const [isPublished, setIsPublished] = useState<boolean>(initial?.is_published || false);
  const [tags, setTags] = useState<string[]>(initial?.tags || []);
  const [banner, setBanner] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initial?.banner || null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [excerptError, setExcerptError] = useState<string | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ open: boolean; slug: string; title: string } | null>(null);

  // Tag Search State
  const [tagSearch, setTagSearch] = useState('');
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);

  const titleLen = title.trim().length;
  const excerptLen = excerpt.trim().length;
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
      setExcerpt(d.excerpt || '');
      setContent(d.content || '');
      setCategory(d.category || '');
      setIsPublished(!!d.is_published);
      const loadedTags = Array.isArray(d.tags) ? d.tags : [];
      setTags(loadedTags.map((t: any) => (typeof t === 'object' && t.id ? t.id : t)));
    } catch { }
  }, []);

  useEffect(() => {
    const dirty =
      (initial && (title !== (initial.title || '') || excerpt !== (initial.excerpt || '') || content !== (initial.content || '') || category !== (initial.category || '') || isPublished !== !!initial.is_published || JSON.stringify(tags) !== JSON.stringify(initial.tags || []))) ||
      (!initial && (titleLen > 0 || excerptLen > 0 || contentLen > 0 || !!category || tags.length > 0 || !!banner));
    function handler(e: BeforeUnloadEvent) {
      if (!dirty || loading) return;
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [initial, title, excerpt, content, category, isPublished, tags, banner, titleLen, excerptLen, contentLen, loading]);

  useEffect(() => {
    if (initial) return;
    try {
      const d = { title, excerpt, content, category, is_published: isPublished, tags };
      localStorage.setItem('articleDraft', JSON.stringify(d));
    } catch { }
  }, [title, excerpt, content, category, isPublished, tags, initial]);

  useEffect(() => {
    if (!category && cats && cats.length > 0) {
      setCategory(cats[0].id);
    }
  }, [cats]);

  useEffect(() => {
    setTitleError(titleLen < 5 ? 'Título deve ter ao menos 5 caracteres' : null);
  }, [titleLen]);

  useEffect(() => {
     if (excerptLen > 500) {
         setExcerptError('Resumo muito longo (máx 500 caracteres)');
     } else {
         setExcerptError(null);
     }
  }, [excerptLen]);

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

  const payload = useMemo(() => ({
    title,
    excerpt,
    content: DOMPurify.sanitize(content || ''),
    category,
    is_published: isPublished,
    tag_ids: tags,
  }), [title, excerpt, content, category, isPublished, tags]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    if (titleError || excerptError || contentError || bannerError || !category) {
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
        const { data } = await api.post('/articles/posts/', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        queryClient.invalidateQueries({ queryKey: ['articles'] });
        try { localStorage.removeItem('articleDraft'); } catch { }
        setSuccessData({ open: true, slug: data.slug, title: 'Artigo publicado com sucesso!' });
      } else {
        const { data } = await api.put(`/articles/posts/${initial.slug}/`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        queryClient.invalidateQueries({ queryKey: ['articles'] });
        queryClient.invalidateQueries({ queryKey: ['article', initial.slug] });
        setSuccessData({ open: true, slug: data.slug, title: 'Artigo atualizado com sucesso!' });
      }
    } catch (err: any) {
      console.error('Submission Error:', err.response?.data);
      setError('Não foi possível salvar o artigo.');
      show({ type: 'error', message: `Erro ao salvar: ${JSON.stringify(err.response?.data || 'Erro desconhecido')}` });
    } finally {
      setLoading(false);
    }
  }

  function saveDraftExplicit() {
    try {
      const d = { title, excerpt, content, category, is_published: isPublished, tags };
      localStorage.setItem('articleDraft', JSON.stringify(d));
      show({ type: 'success', message: 'Rascunho salvo com sucesso' });
    } catch {
      show({ type: 'error', message: 'Não foi possível salvar o rascunho' });
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    const isMac = navigator.platform.toLowerCase().includes('mac');
    const saveCombo = (isMac && e.metaKey && e.key.toLowerCase() === 's') || (!isMac && e.ctrlKey && e.key.toLowerCase() === 's');
    if (saveCombo) {
      e.preventDefault();
      if (!loading && !titleError && !excerptError && !contentError && !bannerError && !!category) {
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

  // Mobile detection for height & UI
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <form onSubmit={onSubmit} onKeyDown={onKeyDown} className="pb-24 md:pb-0 space-y-6" aria-describedby="form-status" aria-live="polite">
      {error && <div className="bg-red-50 text-red-600 p-3 rounded" id="form-status">{error}</div>}

      <div className="space-y-6">
        <div className="space-y-4">
          <div className="card p-4 md:p-0 md:bg-transparent md:border-none md:shadow-none">
            <label htmlFor="title" className="block text-sm font-medium mb-1">Título</label>
            <input
              id="title"
              maxLength={255}
              className={`input text-lg font-bold ${titleError ? 'border-red-500' : ''}`}
              placeholder="Título do Artigo"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-invalid={!!titleError}
            />
            {titleError && <p className="text-xs text-red-500 mt-1">{titleError}</p>}
            <div className="text-xs text-gray-500 mt-1 flex flex-col sm:flex-row sm:justify-between gap-1">
              <span>{titleLen} caracteres</span>
              {slugPreview && <span className="truncate">URL: /artigos/{slugPreview}</span>}
            </div>
          </div>

          <div className="card p-4 md:p-0 md:bg-transparent md:border-none md:shadow-none">
            <label htmlFor="excerpt" className="block text-sm font-medium mb-1">Resumo / Trecho</label>
            <textarea
              id="excerpt"
              className={`input w-full min-h-[100px] text-base ${excerptError ? 'border-red-500' : ''}`}
              placeholder="Um breve resumo do artigo que aparecerá nos cards..."
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              aria-invalid={!!excerptError}
            />
            {excerptError && <p className="text-xs text-red-500 mt-1">{excerptError}</p>}
            <div className="text-xs text-gray-500 mt-1 text-right">{excerptLen}/500 caracteres</div>
          </div>

          <div className={`${contentError ? 'border-red-200' : ''}`}>
            <TinyEditor value={content} onChange={(v) => setContent(v || '')} height={isMobile ? 450 : 750} />
          </div>
          {contentError && <p className="text-xs text-red-500 mt-1">{contentError}</p>}
          <div className="text-xs text-gray-500 mt-1">{contentLen} caracteres</div>
        </div>

        {/* Settings and Publishing Section - Full Width */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="card p-4 space-y-4">
              <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wider">Configurações</h3>
              <div>
                <label htmlFor="category" className="block text-sm font-medium mb-1">Categoria</label>
                <select
                  id="category"
                  className="input w-full h-11 md:h-10" // Larger touch target on mobile
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {cats?.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-3 py-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                />
                <span className="text-sm font-medium">Publicar imediatamente</span>
              </label>

              {/* desktop buttons */}
              <div className="hidden md:flex flex-col gap-2 pt-2 border-t mt-2">
                <button
                  type="submit"
                  disabled={loading || !!titleError || !!excerptError || !!contentError || !!bannerError || !category}
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
                          <Upload className="h-4 w-4" /> Alterar
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-4 text-gray-500">
                      <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <span className="text-sm font-medium">Clique para upload</span>
                      <span className="block text-[10px] opacity-60">Recomendado: 1200x630px</span>
                    </div>
                  )}
                </label>
                {previewUrl && (
                  <button
                    type="button"
                    onClick={() => { setBanner(null); setPreviewUrl(null); }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-2 shadow-lg border-2 border-white hover:bg-red-600 transition-colors z-20"
                    aria-label="Remover banner"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {bannerError && <p className="text-xs text-red-600 font-medium underline decoration-red-200">{bannerError}</p>}
            </div>
          </div>

          <div className="space-y-6">
            {/* Tags Combobox */}
            <div className="card p-4 space-y-4">
              <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wider">Tags</h3>
              <div className="relative">
                <input
                  ref={tagInputRef}
                  className="input w-full h-11 md:h-10"
                  placeholder="Buscar tags..."
                  value={tagSearch}
                  onChange={(e) => {
                    setTagSearch(e.target.value);
                    setTagMenuOpen(true);
                  }}
                  onFocus={() => setTagMenuOpen(true)}
                  onBlur={() => setTimeout(() => setTagMenuOpen(false), 200)}
                />
                {tagMenuOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto animate-scale-in">
                    {filteredTags.length > 0 ? (
                      filteredTags.map(t => (
                        <button
                          key={t.id}
                          type="button"
                          className="w-full text-left px-4 py-3 text-sm hover:bg-muted transition-colors flex items-center justify-between group"
                          onClick={() => {
                            setTags([...tags, t.id]);
                            setTagSearch('');
                            tagInputRef.current?.focus();
                          }}
                        >
                          {t.name}
                          <Check className="h-4 w-4 text-accent opacity-0 group-hover:opacity-100" />
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-6 text-center text-sm text-muted-foreground italic">
                        Nenhuma tag encontrada para "{tagSearch}"
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map(tid => {
                  const tag = tgs?.find(t => t.id === tid);
                  if (!tag) return null;
                  return (
                    <span key={tid} className="badge badge-active py-1.5 px-3 flex items-center gap-2 group">
                      {tag.name}
                      <button
                        type="button"
                        onClick={() => setTags(tags.filter(id => id !== tid))}
                        className="hover:bg-black/20 rounded-full p-0.5"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Mobile Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-border p-4 z-50 md:hidden animate-slide-up shadow-2xl">
        <div className="flex gap-3 max-w-lg mx-auto">
          {!initial && (
            <button
              type="button"
              onClick={saveDraftExplicit}
              className="btn btn-outline flex-1 h-12"
            >
              Rascunho
            </button>
          )}
          <button
            type="submit"
            disabled={loading || !!titleError || !!contentError || !!bannerError || !category}
            className="btn btn-primary flex-[2] h-12 shadow-lg shadow-accent/20"
          >
            {loading ? '...' : (initial ? 'Atualizar' : 'Publicar')}
          </button>
        </div>
      </div>

      <SuccessDialog
        open={!!successData?.open}
        title={successData?.title || ''}
        slug={isPublished ? successData?.slug : undefined}
        description={isPublished ? "Seu artigo já está disponível para todos os leitores." : "Seu rascunho foi salvo com sucesso."}
        confirmLabel={isPublished ? "Ir para o artigo" : "Continuar editando"}
        onClose={() => {
          setSuccessData(null);
          if (isPublished && successData?.slug) {
            router.push(`/artigos/${successData.slug}`);
          }
        }}
      />
    </form>
  );
}
