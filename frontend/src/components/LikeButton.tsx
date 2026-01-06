'use client';
import { Heart } from 'lucide-react';
import { useState } from 'react';
import { useToggleLike } from '@/hooks/useLikes';
import { useAuth } from '@/contexts/AuthContext';

interface LikeButtonProps {
    articleId: string;
    initialLiked?: boolean;
    initialCount?: number;
    size?: 'sm' | 'md' | 'lg';
    showCount?: boolean;
    onChanged?: (liked: boolean, count: number) => void;
}

export function LikeButton({
    articleId,
    initialLiked = false,
    initialCount = 0,
    size = 'md',
    showCount = true,
    onChanged,
}: LikeButtonProps) {
    const { token } = useAuth();
    const toggleLike = useToggleLike(articleId);
    const [liked, setLiked] = useState<boolean>(initialLiked);
    const [count, setCount] = useState<number>(initialCount);
    const [isAnimating, setIsAnimating] = useState(false);

    const handleClick = async (e?: React.MouseEvent<HTMLButtonElement>) => {
        if (e) e.stopPropagation();
        if (!token) {
            // Redirect to login
            window.location.href = '/auth/login';
            return;
        }

        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 600);

        const prevLiked = liked;
        const prevCount = count;
        const nextLiked = !prevLiked;
        const nextCount = prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1;
        setLiked(nextLiked);
        setCount(nextCount);
        if (onChanged) onChanged(nextLiked, nextCount);
        try {
            const res = await toggleLike.mutateAsync();
            if (res && typeof res.liked === 'boolean' && typeof res.like_count === 'number') {
                setLiked(res.liked);
                setCount(res.like_count);
                if (onChanged) onChanged(res.liked, res.like_count);
            }
        } catch {
            setLiked(prevLiked);
            setCount(prevCount);
            if (onChanged) onChanged(prevLiked, prevCount);
        }
    };

    // Size classes
    const sizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-5 w-5',
        lg: 'h-6 w-6',
    };

    const buttonSizeClasses = {
        sm: 'p-1.5 text-xs',
        md: 'p-2 text-sm',
        lg: 'p-3 text-base',
    };

    return (
        <button
            onClick={(e) => handleClick(e)}
            disabled={toggleLike.isPending}
            className={`
        inline-flex items-center gap-2 rounded-lg transition-all
        ${buttonSizeClasses[size]}
        ${liked
                    ? 'text-red-600 hover:text-red-700'
                    : 'text-gray-400 hover:text-red-600'
                }
        ${toggleLike.isPending ? 'opacity-50 cursor-wait' : 'hover:bg-red-50 dark:hover:bg-red-900/10'}
        ${isAnimating ? 'animate-bounce-scale' : ''}
      `}
            aria-label={liked ? 'Descurtir' : 'Curtir'}
            title={token ? (liked ? 'Descurtir' : 'Curtir') : 'Faça login para curtir'}
        >
            <Heart
                className={`${sizeClasses[size]} transition-all ${isAnimating ? 'scale-125' : ''}`}
                fill={liked ? 'currentColor' : 'none'}
            />
            {showCount && (
                <span className="font-medium tabular-nums">
                    {count}
                </span>
            )}
        </button>
    );
}
