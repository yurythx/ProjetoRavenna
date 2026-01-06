'use client';
import { Bookmark } from 'lucide-react';
import { useState } from 'react';
import { useToggleFavorite } from '@/hooks/useLikes';
import { useAuth } from '@/contexts/AuthContext';

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
    const toggleFavorite = useToggleFavorite(articleId);
    const [favorited, setFavorited] = useState<boolean>(initialFavorited);
    const [isAnimating, setIsAnimating] = useState(false);

    const handleClick = async (e?: React.MouseEvent<HTMLButtonElement>) => {
        if (e) e.stopPropagation();
        if (!token) {
            // Redirect to login
            window.location.href = '/auth/login';
            return;
        }

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
            onClick={(e) => handleClick(e)}
            disabled={toggleFavorite.isPending}
            className={`
        inline-flex items-center justify-center rounded-lg transition-all
        ${buttonSizeClasses[size]}
        ${favorited
                    ? 'text-blue-600 hover:text-blue-700'
                    : 'text-gray-400 hover:text-blue-600'
                }
        ${toggleFavorite.isPending ? 'opacity-50 cursor-wait' : 'hover:bg-blue-50 dark:hover:bg-blue-900/10'}
        ${isAnimating ? 'animate-bounce-scale' : ''}
      `}
            aria-label={favorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            title={
                token
                    ? (favorited ? 'Remover dos favoritos' : 'Salvar para depois')
                    : 'Faça login para favoritar'
            }
        >
            <Bookmark
                className={`${sizeClasses[size]} transition-all ${isAnimating ? 'scale-125' : ''}`}
                fill={favorited ? 'currentColor' : 'none'}
            />
        </button>
    );
}
