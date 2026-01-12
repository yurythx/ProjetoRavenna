'use client';
import { useEffect, useState } from 'react';
import { LikeButton } from './LikeButton';
import { FavoriteButton } from './FavoriteButton';
import { Article } from '@/hooks/useArticle';

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
}

export const ArticleStickyHeader = ({
    article,
    liked,
    likeCount,
    favorited,
    onLikeChange,
    onFavoriteChange,
    onShare,
    hasToc,
    onToggleMobileToc
}: ArticleStickyHeaderProps) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        let ticking = false;
        const threshold = 100;

        const updateVisibility = () => {
            const scrollY = window.scrollY;
            setVisible(scrollY > threshold);
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
        <div className={`fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-900 border-b border-gray-300 dark:border-gray-700 shadow-lg z-[60] flex items-center transition-transform duration-300 ${visible ? 'translate-y-0' : '-translate-y-full'}`}>
            <div className="container-custom flex items-center justify-between">
                <h2 className="font-semibold text-sm md:text-base truncate max-w-[60%] text-gray-900 dark:text-white">
                    {article.title}
                </h2>
                <div className="flex gap-2 items-center">
                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-full border border-gray-300 dark:border-gray-600 p-1.5 mr-2">
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
                    {/* Mobile TOC Button */}
                    {hasToc && (
                        <button
                            onClick={onToggleMobileToc}
                            className="lg:hidden px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors border border-gray-300 dark:border-gray-600"
                        >
                            Sumário
                        </button>
                    )}
                    <button 
                        onClick={onShare} 
                        className="px-4 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        Compartilhar
                    </button>
                </div>
            </div>
            {children}
        </div>
    );
};
