'use client';
import { useInfiniteArticles } from '@/hooks/useInfiniteArticles';
import { ArticleCard } from '@/components/ArticleCard';
import { useModules } from '@/contexts/ModuleContext';
import { useCategories } from '@/hooks/useCategories';
import { useTags } from '@/hooks/useTags';
import { useEffect, useState, useMemo, useRef } from 'react';
import { SkeletonCard } from '@/components/SkeletonCard';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Search, Filter, ArrowUpDown, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

import { Suspense } from 'react';

function ArticlesContent() {
  const { disabled } = useModules();
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const initialSearch = searchParams.get('search') || '';
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState<string | undefined>(searchParams.get('category') || undefined);
  const [tags, setTags] = useState<string[]>(
    (searchParams.get('tags') || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
  );
  const [ordering, setOrdering] = useState<string | undefined>(searchParams.get('ordering') || undefined);
  const [pubOnly, setPubOnly] = useState(true);

  // Sync Params
  const params = useMemo(() => {
    const base: Record<string, unknown> = { search, category, tags, ordering };
    if (pubOnly) base['is_published'] = true;
    return base;
  }, [search, category, tags, ordering, pubOnly]);

  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteArticles(params);
  const { data: cats } = useCategories();
  const { data: tgs } = useTags();
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Restore filters from localStorage on mount
  useEffect(() => {
    const hasQP = !!(searchParams.get('search') || searchParams.get('category') || searchParams.get('tags') || searchParams.get('ordering'));
    if (hasQP) return;
    try {
      const raw = localStorage.getItem('artigosFilters');
      if (!raw) return;
      const saved = JSON.parse(raw);
      setSearchInput(saved.search || '');
      setSearch(saved.search || '');
      setCategory(saved.category || undefined);
      setTags(Array.isArray(saved.tags) ? saved.tags : []);
      setOrdering(saved.ordering || undefined);
    } catch { }
  }, []);

  // Update URL and localStorage
  useEffect(() => {
    const qp = new URLSearchParams();
    if (search) qp.set('search', search);
    if (category) qp.set('category', category);
    if (tags.length) qp.set('tags', tags.join(','));
    if (ordering) qp.set('ordering', ordering);
    const qs = qp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
    try {
      localStorage.setItem('artigosFilters', JSON.stringify({ search, category, tags, ordering }));
    } catch { }
  }, [search, category, tags, ordering, pathname, router]);

  // Debounce Search
  useEffect(() => {
    const h = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(h);
  }, [searchInput]);

  // Infinite Scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Admin Toggle
  useEffect(() => {
    if (!token) setPubOnly(true);
  }, [token]);

  if (disabled['articles']) {
    return (
      <div className="container-custom py-16 text-center">
        <p className="text-yellow-600 dark:text-yellow-500 text-lg">⚠️ Módulo de artigos desativado.</p>
      </div>
    );
  }

  const articles = data?.pages.flatMap((page: any) => page.items) || [];
  const featuredArticle = null;
  const gridArticles = articles;

  return (
    <div className="min-h-screen pb-16 bg-background">
      {/* 1. Header Minimalista */}
      <header className="border-b border-border bg-card relative z-10">
        <div className="container-custom py-10 md:py-16 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-4 max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">Artigos</h1>
            <p className="text-muted-foreground text-lg md:text-xl leading-relaxed">
              Insights aprofundados, tutoriais técnicos e as últimas novidades do ecossistema de tecnologia.
            </p>
          </div>
          <div className="w-full md:w-auto flex flex-wrap gap-3">
            {token && (
              <Link href="/artigos/new" className="btn btn-primary whitespace-nowrap flex-1 md:flex-none">
                Novo Artigo
              </Link>
            )}
            {token && (
              <button
                onClick={() => setPubOnly(!pubOnly)}
                className={`btn ${!pubOnly ? 'bg-yellow-500 text-white' : 'btn-outline'} whitespace-nowrap flex-1 md:flex-none`}
              >
                {pubOnly ? 'Ver Rascunhos' : 'Ver Publicados'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. Sticky Filter Bar */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border shadow-sm transition-all">
        <div className="container-custom py-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search */}
          <div className="relative w-full md:w-80 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              className="w-full h-10 pl-10 pr-4 rounded-full bg-muted/50 focus:bg-background border border-transparent focus:border-accent outline-none text-sm transition-all placeholder:text-muted-foreground"
              placeholder="Buscar artigos..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          {/* Horizontal Categories */}
          <div className="w-full md:w-auto overflow-x-auto no-scrollbar flex items-center gap-2 pb-1 md:pb-0 mask-linear-fade">
            <button
              onClick={() => setCategory(undefined)}
              className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border ${!category ? 'bg-foreground text-background border-foreground' : 'bg-transparent text-muted-foreground border-border hover:border-foreground hover:text-foreground'}`}
            >
              Todos
            </button>
            {cats?.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.slug || c.id)}
                className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border ${category === (c.slug || c.id) ? 'bg-foreground text-background border-foreground' : 'bg-transparent text-muted-foreground border-border hover:border-foreground hover:text-foreground'}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container-custom py-12">
        {isLoading && !data ? (
          <div className="grid gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : error ? (
          <div className="text-center py-20 bg-muted/30 rounded-2xl border border-border">
            <p className="text-red-500 font-medium">Não foi possível carregar os artigos.</p>
            <button onClick={() => window.location.reload()} className="mt-4 text-sm underline">Tentar novament</button>
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-32 opacity-60">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-xl font-medium">Nenhum artigo encontrado.</p>
            <button onClick={() => { setSearchInput(''); setCategory(undefined); }} className="text-accent hover:underline mt-2">
              Limpar filtros
            </button>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            {/* Uniform Grid for ALL articles (including the first one) */}
            <div className="grid gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {articles.filter(a => !!a).map((article, i) => (
                <div key={article.id || i} className="animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                  <ArticleCard article={article} categories={cats} tagsList={tgs} />
                </div>
              ))}
            </div>

            {/* Loading Sentinel */}
            <div ref={sentinelRef} className="h-8 flex justify-center py-4">
              {isFetchingNextPage && (
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ArtigosPage() {
  return (
    <Suspense fallback={<div className="container-custom py-20 text-center">Carregando artigos...</div>}>
      <ArticlesContent />
    </Suspense>
  );
}
