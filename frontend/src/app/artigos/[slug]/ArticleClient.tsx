'use client';
import { useArticle, Article } from '@/hooks/useArticle';
import Image from 'next/image';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { useCategories } from '@/hooks/useCategories';
import { useTags } from '@/hooks/useTags';
import { Badge } from '@/components/Badge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { readingTime } from '@/lib/readingTime';
import { useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { useArticles } from '@/hooks/useArticles';
import { ArticleCard } from '@/components/ArticleCard';
import slugify from '@sindresorhus/slugify';
import { components } from '@/types/api';
import { CommentSection } from '@/components/CommentSection';
import { LikeButton } from '@/components/LikeButton';
import { FavoriteButton } from '@/components/FavoriteButton';
import ViewCounter from '@/components/ViewCounter';
import ReadingTime from '@/components/ReadingTime';
import ArticleStats from '@/components/ArticleStats';
import { useTrackView } from '@/hooks/useAnalytics';
import { useReadingProgress } from '@/hooks/useReadingProgress';



const sanitize = (html: string) => {
    if (typeof window === 'undefined') return html;
    return DOMPurify.sanitize(html);
};

export default function ArticleClient({ slug, initialData }: { slug: string, initialData?: Article }) {
    const { data: serverData, isLoading, error } = useArticle(slug, { initialData });
    const data = serverData || initialData;
    const showLoading = isLoading && !data;

    const { show } = useToast();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { data: cats } = useCategories();
    const { data: tgs } = useTags();
    const catSlug = cats?.find((c) => c.id === data?.category)?.slug;
    const { data: related } = useArticles(catSlug ? { category: catSlug, is_published: true, ordering: '-created_at' } : undefined);
    const sortedRelated = (related || []).slice().sort((a, b) => new Date(a.created_at as any).getTime() - new Date(b.created_at as any).getTime());

    // Analytics: Track view on mount
    const { mutate: trackView } = useTrackView(data?.id || '');

    // Analytics: Track reading progress
    const { progress: readingProgress } = useReadingProgress(
        data?.id || '',
        {
            onProgress: (progress, timeSpent) => {
                if (data?.id) {
                    trackView({ reading_progress: progress, time_spent: timeSpent });
                }
            },
            enabled: !!data?.id,
        }
    );

    // Sticky Header State
    const [scrolled, setScrolled] = useState(false);
    // Local like/favorite state to reflect immediate changes
    const [liked, setLiked] = useState<boolean>(!!data?.is_liked);
    const [likeCount, setLikeCount] = useState<number>(data?.like_count || 0);
    const [favorited, setFavorited] = useState<boolean>(!!data?.is_favorited);
    useEffect(() => {
        // Sync when data changes (e.g., refetch)
        if (data) {
            setLiked(!!data.is_liked);
            setLikeCount(data.like_count || 0);
            setFavorited(!!data.is_favorited);
        }
    }, [data?.id]); // Only re-run when article ID changes

    const [toc, setToc] = useState<{ id: string; text: string; level: number }[]>([]);

    useEffect(() => {
        if (!data?.content) return;
        const generatedToc: { id: string; text: string; level: number }[] = [];
        const isHtml = /<[^>]+>/.test(data.content);
        if (isHtml) {
            const div = document.createElement('div');
            div.innerHTML = data.content;
            const heads = div.querySelectorAll('h1,h2,h3,h4,h5,h6');
            heads.forEach((h) => {
                const level = parseInt(h.tagName.substring(1), 10);
                const text = h.textContent?.trim() || '';
                const existing = (h as HTMLElement).id;
                const id = existing || (text ? slugify(text) : '');
                generatedToc.push({ id, text, level });
            });
        }
        setToc(generatedToc);
    }, [data?.content]);

    const articleRef = useRef<HTMLDivElement | null>(null);
    const [activeId, setActiveId] = useState<string>('');
    const [progress, setProgress] = useState<number>(0);

    async function onShare() {
        const url = typeof window !== 'undefined' ? window.location.href : '';
        try {
            if ((navigator as any).share) {
                await (navigator as any).share({ title: data?.title, text: data?.title, url });
            } else if (navigator.clipboard) {
                await navigator.clipboard.writeText(url);
                show({ type: 'success', message: 'Link copiado' });
            }
        } catch { }
    }
    const [confirmOpen, setConfirmOpen] = useState(false);
    async function onDelete() {
        if (!data) return;
        try {
            await api.delete(`/articles/posts/${data.slug}/`);
            queryClient.invalidateQueries({
                predicate: (q) => Array.isArray(q.queryKey) && (q.queryKey[0] === 'articles' || (q.queryKey[0] === 'article' && q.queryKey[1] === data.slug)),
            });
            show({ type: 'success', message: 'Artigo excluído com sucesso' });
            router.push('/artigos');
        } catch {
            show({ type: 'error', message: 'Não foi possível excluir o artigo' });
        }
    }

    useEffect(() => {
        const el = articleRef.current;
        if (!el || !data) return;
        const headings = el.querySelectorAll('h1,h2,h3,h4,h5,h6');
        headings.forEach((h) => {
            if (!(h as HTMLElement).id) {
                const text = h.textContent?.trim() || '';
                if (text) (h as HTMLElement).id = slugify(text);
            }
        });
        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const id = (entry.target as HTMLElement).id;
                        if (id) setActiveId(id);
                    }
                });
            },
            { rootMargin: '0px 0px -70% 0px', threshold: 0.1 }
        );
        headings.forEach((h) => io.observe(h));
        const clickHandler = (e: Event) => {
            const target = e.currentTarget as HTMLElement;
            const id = target.id;
            if (!id) return;
            const url = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}#${id}` : `#${id}`;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(url).then(() => {
                    show({ type: 'success', message: 'Link da seção copiado' });
                });
            }
        };
        headings.forEach((h) => h.addEventListener('click', clickHandler));

        const scrollHandler = () => {
            setScrolled(window.scrollY > 300);
        };
        window.addEventListener('scroll', scrollHandler);

        return () => {
            headings.forEach((h) => h.removeEventListener('click', clickHandler));
            io.disconnect();
            window.removeEventListener('scroll', scrollHandler);
        };
    }, [data?.id]); // Only re-run when article ID changes, not content

    // Track initial view
    useEffect(() => {
        if (data?.id) {
            trackView({});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data?.id]); // Only track once per article, not on every content change

    useEffect(() => {
        const onScroll = () => {
            const el = articleRef.current;
            if (!el) return;
            const total = el.scrollHeight - window.innerHeight;
            const scrolled = Math.min(Math.max(window.scrollY - (el.offsetTop || 0), 0), total);
            const pct = total > 0 ? (scrolled / total) * 100 : 0;
            setProgress(Math.max(0, Math.min(100, pct)));
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    if (showLoading) {
        return (
            <div className="container-custom py-12 animate-pulse">
                {/* Skeleton Header */}
                <div className="max-w-3xl mx-auto space-y-6">
                    <div className="h-4 w-24 bg-muted rounded-full" />
                    <div className="h-12 w-3/4 bg-muted rounded-xl" />
                    <div className="flex gap-4 border-b border-border pb-8">
                        <div className="w-12 h-12 rounded-full bg-muted" />
                        <div className="space-y-2">
                            <div className="h-4 w-32 bg-muted rounded" />
                            <div className="h-3 w-20 bg-muted rounded" />
                        </div>
                    </div>
                </div>
                {/* Skeleton Banner */}
                <div className="aspect-[21/9] w-full bg-muted rounded-2xl my-8" />
                {/* Skeleton Text */}
                <div className="max-w-3xl mx-auto space-y-4">
                    <div className="h-4 w-full bg-muted rounded" />
                    <div className="h-4 w-full bg-muted rounded" />
                    <div className="h-4 w-5/6 bg-muted rounded" />
                    <div className="h-4 w-4/6 bg-muted rounded" />
                    <div className="h-4 w-full bg-muted rounded pt-4" />
                    <div className="h-4 w-full bg-muted rounded" />
                </div>
            </div>
        );
    }
    if (error || !data) return <div className="container-custom py-20 text-center"><p className="text-red-500 font-medium">Artigo não encontrado</p></div>;

    const authorName = data.author_name || 'Autor';
    const rawBanner = data.banner as unknown as string || '';
    const banner = rawBanner && /^https?:\/\//.test(rawBanner) ? `/api/img?url=${encodeURIComponent(rawBanner)}` : rawBanner;

    return (
        <div className="container-custom pb-16">
            {/* Scroll Progress Bar */}
            <div className="fixed top-0 left-0 h-1 z-[70] transition-all duration-300"
                style={{ width: `${progress}%`, background: 'var(--accent)' }} />

            {/* Sticky Header */}
            <div className={`fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-900 border-b border-gray-300 dark:border-gray-700 shadow-lg z-[60] flex items-center transition-transform duration-300 ${scrolled ? 'translate-y-0' : '-translate-y-full'}`}>
                <div className="container-custom flex items-center justify-between">
                    <h2 className="font-semibold text-sm md:text-base truncate max-w-[60%] text-gray-900 dark:text-white">{data.title}</h2>
                    <div className="flex gap-2 items-center">
                        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-full border border-gray-300 dark:border-gray-600 p-1.5 mr-2">
                            <LikeButton
                                articleId={data.id}
                                initialLiked={liked}
                                initialCount={likeCount}
                                onChanged={(l, c) => { setLiked(l); setLikeCount(c); }}
                                size="sm"
                                showCount={true}
                            />
                            <FavoriteButton
                                articleId={data.id}
                                initialFavorited={favorited}
                                onChanged={(f) => setFavorited(f)}
                                size="sm"
                            />
                        </div>
                        {/* Mobile TOC Button */}
                        {toc.length > 0 && (
                            <button
                                onClick={() => {
                                    const el = document.getElementById('mobile-toc');
                                    if (el) el.classList.toggle('hidden');
                                }}
                                className="lg:hidden px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors border border-gray-300 dark:border-gray-600"
                            >
                                Sumário
                            </button>
                        )}
                        <button onClick={onShare} className="px-4 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm">Compartilhar</button>
                    </div>
                </div>
                {/* Mobile TOC Popover */}
                <div id="mobile-toc" className="hidden absolute top-full left-0 right-0 bg-white dark:bg-gray-900 border-b border-gray-300 dark:border-gray-700 p-6 shadow-2xl lg:hidden max-h-[60vh] overflow-y-auto z-50">
                    <h5 className="font-bold text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-4">Neste artigo</h5>
                    <nav className="space-y-3">
                        {toc.map((item, i) => (
                            <a
                                key={`${item.id}-mob-${i}`}
                                href={`#${item.id}`}
                                className={`block text-sm transition-all ${item.id === activeId ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'}`}
                                style={{ marginLeft: `${(item.level - 1) * 8}px` }}
                                onClick={() => document.getElementById('mobile-toc')?.classList.add('hidden')}
                            >
                                {item.text}
                            </a>
                        ))}
                    </nav>
                </div>
            </div>

            <ConfirmDialog
                open={confirmOpen}
                title="Excluir artigo"
                description="Esta ação é permanente."
                onCancel={() => setConfirmOpen(false)}
                onConfirm={() => onDelete()}
            />

            <div className="grid lg:grid-cols-[1fr_300px] gap-12 pt-8">
                <div>
                    {/* Header Section */}
                    <header className="mb-8">
                        {data.banner ? (
                            <div className="relative rounded-2xl overflow-hidden shadow-xl mb-8 group">
                                <div className="relative aspect-[21/9]">
                                    <Image
                                        src={banner}
                                        alt={data.title}
                                        fill
                                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 1000px"
                                        unoptimized
                                    />
                                    <div className="absolute inset-0 bg-black/20" />
                                </div>
                            </div>
                        ) : (
                            /* No Banner Fallback Header */
                            <div className="h-12"></div>
                        )}

                        <div className="max-w-3xl mx-auto">
                            <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6 overflow-x-auto whitespace-nowrap">
                                <Link href="/artigos" className="hover:text-accent transition-colors">Artigos</Link>
                                <span>/</span>
                                <span className="font-medium text-foreground">{cats?.find((c) => c.id === data.category)?.name || 'Geral'}</span>
                            </nav>

                            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-6 leading-tight text-foreground">
                                {data.title}
                            </h1>

                            {/* Like and Favorite Buttons - Main */}
                            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-border">
                                <LikeButton
                                    articleId={data.id}
                                    initialLiked={liked}
                                    initialCount={likeCount}
                                    onChanged={(l, c) => { setLiked(l); setLikeCount(c); }}
                                    size="md"
                                    showCount={true}
                                />
                                <FavoriteButton
                                    articleId={data.id}
                                    initialFavorited={favorited}
                                    onChanged={(f) => setFavorited(f)}
                                    size="md"
                                />
                            </div>

                            {/* Article Stats */}
                            {data.view_count !== undefined && (
                                <div className="mb-6">
                                    <ArticleStats
                                        viewCount={data.view_count}
                                        uniqueViews={data.unique_views || 0}
                                        readingTime={data.reading_time || 5}
                                        engagementRate={data.engagement_rate || 0}
                                        likeCount={likeCount}
                                        commentCount={0}
                                        layout="horizontal"
                                        variant="full"
                                    />
                                </div>
                            )}

                            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground border-b border-border pb-8 relative">
                                {/* Desktop Sidebar Actions */}
                                <div className="hidden xl:flex flex-col gap-4 absolute -left-20 top-0 pt-2 animate-fade-in">
                                    <div className="flex flex-col gap-2 p-2 bg-card border border-border rounded-full shadow-lg sticky top-32">
                                        <LikeButton
                                            articleId={data.id}
                                            initialLiked={liked}
                                            initialCount={likeCount}
                                            onChanged={(l, c) => { setLiked(l); setLikeCount(c); }}
                                            size="sm"
                                            showCount={true}
                                        />
                                        <div className="w-full h-[1px] bg-border mx-auto px-2" />
                                        <FavoriteButton
                                            articleId={data.id}
                                            initialFavorited={favorited}
                                            onChanged={(f) => setFavorited(f)}
                                            size="sm"
                                        />
                                        <div className="w-full h-[1px] bg-border mx-auto px-2" />
                                        <button onClick={onShare} className="p-2 text-muted-foreground hover:text-accent transition-colors" title="Compartilhar">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-lg">
                                        {authorName.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-foreground">{authorName}</p>
                                        <p className="text-xs">{new Date(data.created_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 ml-auto md:ml-0">
                                    {data.reading_time && (
                                        <ReadingTime minutes={data.reading_time} size="sm" />
                                    )}
                                    {data.view_count !== undefined && (
                                        <ViewCounter count={data.view_count} size="sm" />
                                    )}
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* Article Content */}
                    <div className="max-w-3xl mx-auto">
                        <article
                            ref={articleRef}
                            suppressHydrationWarning
                            className="prose prose-lg prose-slate dark:prose-invert max-w-none overflow-anchor-none"
                            dangerouslySetInnerHTML={{
                                __html: sanitize(data.content || ''),
                            }}
                        />

                        {/* Tags Footer */}
                        <div className="mt-12 pt-8 border-t border-border">
                            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Tópicos Relacionados</h4>
                            <div className="flex flex-wrap gap-2">
                                {data.tags?.map((tag: any) => {
                                    const tid = typeof tag === 'string' ? tag : tag.id;
                                    const tagData = tgs?.find((t) => t.id === tid) || (typeof tag === 'object' ? tag : null);
                                    if (!tagData) return null;
                                    return (
                                        <Link
                                            key={tid}
                                            href={`/artigos?tags=${tagData.slug || tagData.name}`}
                                            className="px-4 py-1.5 rounded-full bg-muted hover:bg-accent hover:text-white transition-colors text-sm font-medium"
                                        >
                                            #{tagData.name}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Author Bio Card */}
                        <div className="mt-12 p-8 rounded-2xl bg-muted/30 border border-border flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left">
                            <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-3xl shrink-0">
                                {authorName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="font-bold text-xl mb-2">Sobre {authorName}</h3>
                                <p className="text-muted-foreground mb-4">
                                    Redator especialista em tecnologia e inovação no Projeto Ravenna. Apaixonado por compartilhar conhecimento sobre desenvolvimento, infraestrutura e boas práticas.
                                </p>
                                <Link href={`/artigos?author=${authorName}`} className="text-accent font-medium hover:underline">
                                    Ver mais artigos deste autor →
                                </Link>
                            </div>
                        </div>

                        {/* Admin Actions */}
                        {data.can_edit && (
                            <div className="mt-8 flex gap-3 justify-end border-t border-border pt-6">
                                <Link href={`/artigos/${data.slug}/edit`} className="btn btn-outline">Editar Artigo</Link>
                                <button onClick={() => setConfirmOpen(true)} className="btn bg-red-600 hover:bg-red-700 text-white border-transparent">Deletar</button>
                            </div>
                        )}

                        {/* Social Share Buttons */}
                        <div className="mt-8 flex gap-4 justify-center">
                            <button
                                onClick={() => {
                                    const text = `Confira "${data.title}" em ${window.location.href}`;
                                    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
                                }}
                                className="flex items-center gap-2 px-6 py-3 rounded-full bg-black text-white hover:opacity-80 transition-opacity"
                            >
                                <svg fill="currentColor" width="20" height="20" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.84 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" /></svg>
                                Compartilhar no X
                            </button>
                            <button
                                onClick={() => {
                                    const text = `Confira "${data.title}" em ${window.location.href}`;
                                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                                }}
                                className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#25D366] text-white hover:opacity-80 transition-opacity"
                            >
                                <svg fill="currentColor" width="20" height="20" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" /></svg>
                                Compartilhar no WhatsApp
                            </button>
                        </div>

                        {/* Comments Section */}
                        <div className="mt-16 pt-12 border-t border-border">
                            <CommentSection articleId={data.id} />
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <aside className="hidden lg:block space-y-8">
                    {/* TOC Widget */}
                    {toc.length > 0 && (
                        <div className="sticky top-24 bg-card rounded-xl border border-border p-6 shadow-sm">
                            <h5 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4">Neste artigo</h5>
                            <nav className="space-y-1">
                                {toc.map((item, i) => (
                                    <a
                                        key={`${item.id}-${i}`}
                                        href={`#${item.id}`}
                                        className={`block py-1.5 text-sm transition-all border-l-2 pl-3 ${item.id === activeId ? 'border-accent text-accent font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                                        style={{ marginLeft: `${(item.level - 1) * 8}px` }}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                                        }}
                                    >
                                        {item.text}
                                    </a>
                                ))}
                            </nav>
                        </div>
                    )}

                    {/* CTA Widget */}
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 rounded-xl shadow-lg">
                        <h4 className="font-bold text-lg mb-2">Gostou deste conteúdo?</h4>
                        <p className="text-sm text-gray-300 mb-4">Descubra como o Projeto Ravenna pode revolucionar a gestão da sua empresa.</p>
                        <Link href="/" className="block w-full py-2 bg-accent text-center rounded-lg font-medium hover:bg-accent-hover transition-colors">
                            Conhecer Soluções
                        </Link>
                    </div>
                </aside>
            </div>

            {/* Related Articles */}
            <div className="max-w-5xl mx-auto mt-24 pt-12 border-t border-border">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-bold">Leia também</h3>
                    <Link href="/artigos" className="text-accent hover:underline">Ver todos →</Link>
                </div>
                <div className="grid md:grid-cols-3 gap-8">
                    {sortedRelated.filter((a) => a.slug !== data.slug).slice(0, 3).map((a) => (
                        <ArticleCard key={a.id} article={a as any} categories={cats} tagsList={tgs} />
                    ))}
                </div>
            </div>
        </div>
    );
}
