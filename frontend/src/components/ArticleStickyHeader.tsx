'use client';

import { useEffect, useState } from 'react';
import { Article } from '@/hooks/useArticle';
import { LikeButton } from './LikeButton';
import { FavoriteButton } from './FavoriteButton';

interface ArticleStickyHeaderProps {
    article: Article;
    liked: boolean;
    likeCount: number;
    favorited: boolean;
    onLikeChange: (liked: boolean, count: number) => void;
    onFavoriteChange: (favorited: boolean) => void;
    onShare: () => void;
    hasToc: boolean;
    onToggleMobileToc: () => void;
    children?: React.ReactNode;
}

export function ArticleStickyHeader({
    article,
    liked,
    likeCount,
    favorited,
    onLikeChange,
    onFavoriteChange,
    onShare,
    hasToc,
    onToggleMobileToc,
    children
}: ArticleStickyHeaderProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        let ticking = false;
        const threshold = 100;

        const updateVisibility = () => {
            setIsVisible(window.scrollY > threshold);
            ticking = false;
        };

        const onScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(updateVisibility);
                ticking = true;
            }
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <div className={`fixed top-0 left-0 right-0 h-16 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border shadow-sm z-[60] flex items-center transition-transform duration-300 ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}>
            <div className="container-custom flex items-center justify-between w-full">
                <h2 className="font-semibold text-sm md:text-base truncate max-w-[50%] md:max-w-[60%] text-foreground">
                    {article.title}
                </h2>
                
                <div className="flex gap-2 items-center shrink-0">
                    <div className="flex bg-muted/50 rounded-full border border-border p-1 mr-1 md:mr-2">
                        <LikeButton
                            articleId={article.id}
                            initialLiked={liked}
                            initialCount={likeCount}
                            onChanged={onLikeChange}
                            size="sm"
                            showCount={true}
                        />
                        <FavoriteButton
                            articleId={article.id}
                            initialFavorited={favorited}
                            onChanged={onFavoriteChange}
                            size="sm"
                        />
                    </div>
                    
                    {hasToc && (
                        <button
                            onClick={onToggleMobileToc}
                            className="lg:hidden px-3 py-1.5 text-xs font-medium rounded-lg bg-muted text-foreground hover:bg-muted/80 transition-colors border border-border"
                        >
                            Sumário
                        </button>
                    )}
                    
                    <button 
                        onClick={onShare} 
                        className="hidden md:block px-4 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                    >
                        Compartilhar
                    </button>
                    
                    {/* Mobile Share Icon (visible only on small screens) */}
                    <button 
                        onClick={onShare}
                        className="md:hidden p-2 text-muted-foreground hover:text-foreground"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                    </button>
                </div>
            </div>
            {children}
        </div>
    );
}
