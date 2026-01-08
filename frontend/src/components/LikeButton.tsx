import { Heart } from 'lucide-react';
import { useState } from 'react';
import { useToggleLike } from '@/hooks/useLikes';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';

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
    const { show } = useToast();
    const router = useRouter();
    const toggleLike = useToggleLike(articleId);
    const [liked, setLiked] = useState<boolean>(initialLiked);
    const [count, setCount] = useState<number>(initialCount);
    const [isAnimating, setIsAnimating] = useState(false);

    const handleClick = async (e?: React.MouseEvent<HTMLButtonElement>) => {
        if (e) e.preventDefault();
        if (e) e.stopPropagation();

        if (!token) {
            show({ type: 'warning', message: 'Faça login para curtir artigos' });
            router.push('/auth/login');
            return;
        }

        if (toggleLike.isPending) return;

        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 400);

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
        sm: 'p-1.5 text-xs px-2',
        md: 'p-2 text-sm px-3',
        lg: 'p-3 text-base px-4',
    };

    return (
        <button
            onClick={handleClick}
            disabled={toggleLike.isPending}
            className={`
                inline-flex items-center gap-1.5 rounded-full transition-all active:scale-95
                ${buttonSizeClasses[size]}
                ${liked
                    ? 'text-red-500 bg-red-500/10 border-red-500/20'
                    : 'text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 border-transparent'
                }
                border
                ${toggleLike.isPending ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
                ${isAnimating && liked ? 'animate-heart-burst' : ''}
                ${isAnimating && !liked ? 'animate-bounce-scale' : ''}
            `}
            aria-label={liked ? 'Descurtir' : 'Curtir'}
            title={liked ? 'Descurtir' : 'Curtir'}
        >
            <Heart
                className={`${sizeClasses[size]} transition-all ${liked ? 'fill-current' : 'fill-none'}`}
            />
            {showCount && (
                <span className="font-bold tabular-nums">
                    {count}
                </span>
            )}
        </button>
    );
}
