import { Bookmark } from 'lucide-react';
import { useState } from 'react';
import { useToggleFavorite } from '@/hooks/useLikes';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';

interface FavoriteButtonProps {
    articleId: string;
    initialFavorited?: boolean;
    size?: 'sm' | 'md' | 'lg';
    onChanged?: (favorited: boolean) => void;
}

export function FavoriteButton({
    articleId,
    initialFavorited = false,
    size = 'md',
    onChanged,
}: FavoriteButtonProps) {
    const { token } = useAuth();
    const { show } = useToast();
    const router = useRouter();
    const toggleFavorite = useToggleFavorite(articleId);
    const [favorited, setFavorited] = useState<boolean>(initialFavorited);
    const [isAnimating, setIsAnimating] = useState(false);

    const handleClick = async (e?: React.MouseEvent<HTMLButtonElement>) => {
        if (e) e.preventDefault();
        if (e) e.stopPropagation();

        if (!token) {
            show({ type: 'warning', message: 'Faça login para salvar artigos' });
            router.push('/auth/login');
            return;
        }

        if (toggleFavorite.isPending) return;

        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 400);

        const prev = favorited;
        const next = !prev;
        setFavorited(next);
        if (onChanged) onChanged(next);

        try {
            const res = await toggleFavorite.mutateAsync();
            if (res && typeof res.favorited === 'boolean') {
                setFavorited(res.favorited);
                if (onChanged) onChanged(res.favorited);
            }
        } catch {
            setFavorited(prev);
            if (onChanged) onChanged(prev);
        }
    };

    // Size classes
    const sizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-5 w-5',
        lg: 'h-6 w-6',
    };

    const buttonSizeClasses = {
        sm: 'p-1.5',
        md: 'p-2',
        lg: 'p-3',
    };

    return (
        <button
            onClick={handleClick}
            disabled={toggleFavorite.isPending}
            className={`
                inline-flex items-center justify-center rounded-full transition-all active:scale-90
                ${buttonSizeClasses[size]}
                ${favorited
                    ? 'text-blue-500 bg-blue-500/10'
                    : 'text-muted-foreground hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10'
                }
                ${toggleFavorite.isPending ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
                ${isAnimating ? 'animate-bounce-scale' : ''}
            `}
            aria-label={favorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            title={favorited ? 'Remover dos favoritos' : 'Salvar para depois'}
        >
            <Bookmark
                className={`${sizeClasses[size]} transition-all ${favorited ? 'fill-current' : 'fill-none'}`}
            />
        </button>
    );
}
