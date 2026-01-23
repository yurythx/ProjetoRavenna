'use client';
import { useArticle, Article } from '@/hooks/useArticle';
import { useProfile } from '@/hooks/useProfile';
import Image from 'next/image';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { useCategories } from '@/hooks/useCategories';
import { useTags } from '@/hooks/useTags';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { useArticles } from '@/hooks/useArticles';
import { ArticleCard } from '@/components/ArticleCard';
import slugify from '@sindresorhus/slugify';
import { CommentSection } from '@/components/CommentSection';
import { LikeButton } from '@/components/LikeButton';
import { FavoriteButton } from '@/components/FavoriteButton';
import ViewCounter from '@/components/ViewCounter';
import ReadingTime from '@/components/ReadingTime';
import ArticleStats from '@/components/ArticleStats';
import { useTrackView, useArticleStats } from '@/hooks/useAnalytics';
import { useReadingProgress } from '@/hooks/useReadingProgress';
import { BlockRenderer } from '@/components/BlockRenderer';
import { useTranslations, useLocale } from 'next-intl';

import { ArticleScrollProgress } from '@/components/ArticleScrollProgress';
import { ArticleStickyHeader } from '@/components/ArticleStickyHeader';
import { ArticleTOC, MobileTOC } from '@/components/ArticleTOC';

const sanitize = (html: string) => {
    if (typeof window === 'undefined') return html;
    return DOMPurify.sanitize(html);
};

export default function ArticleClient({ slug, initialData }: { slug: string, initialData?: Article }) {
    const t = useTranslations('ArticleDetail');
    const tc = useTranslations('Common');
    const locale = useLocale();
    const articleRef = useRef<HTMLDivElement | null>(null);
    const { data: serverData, isLoading, error } = useArticle(slug, { initialData });
    const { profile } = useProfile();
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
    const onProgress = useCallback((progress: number, timeSpent: number) => {
        if (data?.id) {
            trackView({ reading_progress: progress, time_spent: timeSpent });
        }
    }, [data?.id, trackView]);

    const { progress: readingProgress } = useReadingProgress(
        data?.id || '',
        {
            onProgress,
            enabled: !!data?.id,
            disableVisualUpdates: true,
        }
    );

    const canEdit = data?.can_edit || (profile?.id && data?.author && profile.id === data.author);
    const { data: liveStats } = useArticleStats(data?.id || '', !!data?.id);

    // Sticky Header State
    const [isMobileTocOpen, setIsMobileTocOpen] = useState(false);

    // TOC State
    const [tocItems, setTocItems] = useState<{ id: string; text: string; level: number }[]>([]);
    const [processedContent, setProcessedContent] = useState('');

    // Like & Favorite State
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [favorited, setFavorited] = useState(false);

    useEffect(() => {
        if (data) {
            setLiked(data.is_liked || false);
            setLikeCount(data.like_count || 0);
            setFavorited(data.is_favorited || false);
        }
    }, [data]);

    // Process content for TOC - Client Side Only to match Hydration
    useEffect(() => {
        if (!data?.content && !(data as any)?.content_json) {
            setProcessedContent('');
            setTocItems([]);
            return;
        }

        // TOC generation for JSON content might need a different approach, 
        // but for now we rely on HTML or skip it if it's JSON to keep it simple.
        if (!data?.content) {
            setTocItems([]);
            return;
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(data.content, 'text/html');
        const headings = doc.querySelectorAll('h1,h2,h3,h4,h5,h6');
        const generatedToc: { id: string; text: string; level: number }[] = [];

        headings.forEach((h, index) => {
            const text = h.textContent?.trim() || '';
            if (!text) return;

            // Generate stable ID
            let id = h.id;
            if (!id) {
                id = slugify(text);
                if (generatedToc.some(item => item.id === id)) {
                    id = `${id}-${index}`;
                }
                id = id;
            }

            generatedToc.push({
                id,
                text,
                level: parseInt(h.tagName.substring(1), 10)
            });
        });

        setProcessedContent(sanitize(doc.body.innerHTML));
        setTocItems(generatedToc);

    }, [data?.content, (data as any)?.content_json]);

    // Click handler for "copy link" feature (delegated)
    useEffect(() => {
        const articleEl = articleRef.current;
        if (!articleEl) return;

        const clickHandler = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const heading = target.closest('h1,h2,h3,h4,h5,h6');
            if (!heading || !heading.id) return;

            const url = `${window.location.origin}${window.location.pathname}#${heading.id}`;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(url).then(() => {
                    show({ type: 'success', message: t('sectionLinkCopied') });
                });
            }
        };

        articleEl.addEventListener('click', clickHandler);
        return () => articleEl.removeEventListener('click', clickHandler);
    }, [show, processedContent, t]); // Re-bind when content changes


    async function onShare() {
        const url = typeof window !== 'undefined' ? window.location.href : '';
        try {
            if ((navigator as any).share) {
                await (navigator as any).share({ title: data?.title, text: data?.title, url });
            } else if (navigator.clipboard) {
                await navigator.clipboard.writeText(url);
                show({ type: 'success', message: t('linkCopied') });
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
            show({ type: 'success', message: t('successDelete') });
            router.push('/artigos');
        } catch (err: any) {
            if (err.response?.status === 403) {
                show({ type: 'error', message: t('noPermissionDelete') });
            } else {
                show({ type: 'error', message: t('errorDelete') });
            }
        }
    }

    // Track initial view
    useEffect(() => {
        if (data?.id) {
            trackView({});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data?.id]);

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
    if (error || !data) return <div className="container-custom py-20 text-center"><p className="text-red-500 font-medium">{t('notFound')}</p></div>;

    const authorName = data.author_name || t('author');
    const rawBanner = data.banner as unknown as string || '';
    const banner = rawBanner && /^https?:\/\//.test(rawBanner) ? `/api/img?url=${encodeURIComponent(rawBanner)}` : rawBanner;

    return (
        <div className="container-custom pb-16">
            <ArticleScrollProgress />

            <ArticleStickyHeader
                article={data}
                liked={liked}
                likeCount={likeCount}
                favorited={favorited}
                onLikeChange={(l, c) => { setLiked(l); setLikeCount(c); }}
                onFavoriteChange={(f) => setFavorited(f)}
                onShare={onShare}
                hasToc={tocItems.length > 0}
                onToggleMobileToc={() => setIsMobileTocOpen(!isMobileTocOpen)}
            >
                <MobileTOC
                    items={tocItems}
                    isOpen={isMobileTocOpen}
                    onClose={() => setIsMobileTocOpen(false)}
                />
            </ArticleStickyHeader>

            <ConfirmDialog
                open={confirmOpen}
                title={t('deleteArticle')}
                description={t('deleteDescription')}
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
                                <Link href="/artigos" className="hover:text-accent transition-colors">{t('backToArticles')}</Link>
                                <span>/</span>
                                <span className="font-medium text-foreground">{cats?.find((c) => c.id === data.category)?.name || t('general')}</span>
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
                            {(data.view_count !== undefined || liveStats) && (
                                <div className="mb-6">
                                    <ArticleStats
                                        viewCount={liveStats?.view_count ?? (data.view_count as number)}
                                        uniqueViews={liveStats?.unique_views ?? (data.unique_views || 0)}
                                        readingTime={liveStats?.reading_time ?? (data.reading_time || 5)}
                                        engagementRate={liveStats?.engagement_rate ?? (data.engagement_rate || 0)}
                                        likeCount={liveStats?.like_count ?? likeCount}
                                        commentCount={liveStats?.comment_count ?? 0}
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
                                        <button onClick={onShare} className="p-2 text-muted-foreground hover:text-accent transition-colors" title={t('share')}>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {data.author_avatar ? (
                                        <img
                                            src={data.author_avatar}
                                            alt={authorName}
                                            className="w-10 h-10 rounded-full object-cover border border-accent/20"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-lg">
                                            {authorName.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-semibold text-foreground">{authorName}</p>
                                        <p className="text-xs">{new Date(data.created_at).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
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
                        <div ref={articleRef} className="max-w-none prose prose-lg dark:prose-invert">
                            {(data as any).content_json ? (
                                <BlockRenderer content={(data as any).content_json} />
                            ) : (
                                <div
                                    className="prose-headings:scroll-mt-24 
                                        prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                                        prose-img:rounded-xl prose-img:shadow-lg prose-img:w-full prose-img:h-auto
                                        [&>iframe]:w-full [&>iframe]:aspect-video [&>iframe]:rounded-xl"
                                    dangerouslySetInnerHTML={{ __html: processedContent || sanitize(data.content || '') }}
                                    suppressHydrationWarning
                                />
                            )}
                        </div>

                        {/* Tags Footer */}
                        <div className="mt-12 pt-8 border-t border-border">
                            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">{t('relatedTopics')}</h4>
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
                            {data.author_avatar ? (
                                <img
                                    src={data.author_avatar}
                                    alt={authorName}
                                    className="w-20 h-20 rounded-full object-cover border-2 border-accent/20 shrink-0"
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-3xl shrink-0">
                                    {authorName.charAt(0).toUpperCase()}
                                </div>
                            )}

                            <div className="flex-1">
                                <h3 className="font-bold text-xl mb-2">{t('aboutAuthor', { name: authorName })}</h3>
                                <p className="text-muted-foreground mb-4 leading-relaxed">
                                    {data.author_bio || t('noAuthorBio')}
                                </p>
                                <Link href={`/artigos?author=${authorName}`} className="text-accent font-medium hover:underline inline-flex items-center gap-1">
                                    {t('moreFromAuthor')} <span aria-hidden="true">→</span>
                                </Link>
                            </div>
                        </div>

                        {/* Admin Actions */}
                        {canEdit && (
                            <div className="mt-8 flex gap-3 justify-end border-t border-border pt-6">
                                <Link href={`/artigos/${data.slug}/edit`} className="btn btn-outline">{t('editArticle')}</Link>
                                <button onClick={() => setConfirmOpen(true)} className="btn bg-red-600 hover:bg-red-700 text-white border-transparent">{tc('delete')}</button>
                            </div>
                        )}

                        {/* Social Share Buttons */}
                        <div className="mt-8 flex gap-4 justify-center">
                            <button
                                onClick={() => {
                                    const text = t('shareTemplate', { title: data.title, url: window.location.href });
                                    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
                                }}
                                className="flex items-center gap-2 px-6 py-3 rounded-full bg-black text-white hover:opacity-80 transition-opacity"
                            >
                                <svg fill="currentColor" width="20" height="20" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.84 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" /></svg>
                                {t('shareOnX')}
                            </button>
                            <button
                                onClick={() => {
                                    const text = t('shareTemplate', { title: data.title, url: window.location.href });
                                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                                }}
                                className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#25D366] text-white hover:opacity-80 transition-opacity"
                            >
                                <svg fill="currentColor" width="20" height="20" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" /></svg>
                                {t('shareOnWA')}
                            </button>
                        </div>

                        {/* Comments Section */}
                        <div className="mt-16 pt-12 border-t border-border">
                            <CommentSection articleId={data.id} />
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <aside className="hidden lg:block">
                    <div className="sticky top-24 space-y-6">
                        {tocItems.length > 0 && <ArticleTOC items={tocItems} />}

                        {/* Related Articles (Desktop) */}
                        {sortedRelated.length > 0 && (
                            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                                <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4">
                                    {t('related')}
                                </h3>
                                <div className="space-y-4">
                                    {sortedRelated.slice(0, 3).map((relatedArticle) => (
                                        <Link
                                            key={relatedArticle.id}
                                            href={`/artigos/${relatedArticle.slug}`}
                                            className="block group"
                                        >
                                            <h4 className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-2 mb-1">
                                                {relatedArticle.title}
                                            </h4>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(relatedArticle.created_at).toLocaleDateString(locale)}
                                            </p>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </aside>
            </div>

            {/* Related Articles */}
            <div className="max-w-5xl mx-auto mt-24 pt-12 border-t border-border">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-bold">{t('readAlso')}</h3>
                    <Link href="/artigos" className="text-accent hover:underline">{t('viewAll')} →</Link>
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
