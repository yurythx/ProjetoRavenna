import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { components } from '@/types/api';

type Article = components['schemas']['Article'];

interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

interface ToggleLikeResponse {
    liked: boolean;
    like_count: number;
    article_id: string;
}

/**
 * Hook to toggle like on an article
 * Implements optimistic updates for instant UI feedback
 */
export function useToggleLike(articleId: string) {
    const queryClient = useQueryClient();
    const { token } = useAuth();
    const router = useRouter();

    return useMutation({
        mutationFn: async () => {
            if (!token) {
                router.push('/auth/login');
                throw new Error('Authentication required');
            }

            const { data } = await api.post<ToggleLikeResponse>('/articles/likes/toggle/', {
                article_id: articleId
            });
            return data;
        },
        onMutate: async () => {
            // Cancel outgoing refetches broadly
            await queryClient.cancelQueries({
                predicate: (q) => Array.isArray(q.queryKey) && (q.queryKey[0] === 'article' || q.queryKey[0] === 'articles')
            });

            // Snapshot previous value
            const previousArticle = queryClient.getQueryData(['article', articleId]);

            // Optimistically update article
            queryClient.setQueryData(['article', articleId], (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    is_liked: !old.is_liked,
                    like_count: old.is_liked ? (old.like_count - 1) : (old.like_count + 1),
                };
            });
            // Optimistically update any 'article' detail cache by matching id
            queryClient.getQueryCache().findAll({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'article' })
                .forEach((q) => {
                    const key = q.queryKey;
                    queryClient.setQueryData(key, (old: any) => {
                        if (!old || old.id !== articleId) return old;
                        return {
                            ...old,
                            is_liked: !old.is_liked,
                            like_count: old.is_liked ? (old.like_count - 1) : (old.like_count + 1),
                        };
                    });
                });

            // Optimistically update articles list variants
            queryClient.getQueryCache().findAll({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'articles' })
                .forEach((q) => {
                    const key = q.queryKey;
                    queryClient.setQueryData(key, (old: any) => {
                        if (!old) return old;
                        // Handle both array and paginated shapes
                        if (Array.isArray(old)) {
                            return old.map((article: any) =>
                                article.id === articleId
                                    ? {
                                        ...article,
                                        is_liked: !article.is_liked,
                                        like_count: article.is_liked ? (article.like_count - 1) : (article.like_count + 1),
                                    }
                                    : article
                            );
                        }
                        if (old?.results) {
                            return {
                                ...old,
                                results: old.results.map((article: any) =>
                                    article.id === articleId
                                        ? {
                                            ...article,
                                            is_liked: !article.is_liked,
                                            like_count: article.is_liked ? (article.like_count - 1) : (article.like_count + 1),
                                        }
                                        : article
                                ),
                            };
                        }
                        if (old?.items) {
                            return {
                                ...old,
                                items: old.items.map((article: any) =>
                                    article.id === articleId
                                        ? {
                                            ...article,
                                            is_liked: !article.is_liked,
                                            like_count: article.is_liked ? (article.like_count - 1) : (article.like_count + 1),
                                        }
                                        : article
                                ),
                            };
                        }
                        return old;
                    });
                });

            return { previousArticle };
        },
        onError: (err, variables, context) => {
            // Rollback on error
            if (context?.previousArticle) {
                queryClient.setQueryData(['article', articleId], context.previousArticle);
            }
            queryClient.invalidateQueries({
                predicate: (q) => Array.isArray(q.queryKey) && (q.queryKey[0] === 'article' || q.queryKey[0] === 'articles')
            });
        },
        onSuccess: () => {
            // Invalidate queries to ensure consistency
            queryClient.invalidateQueries({
                predicate: (q) => Array.isArray(q.queryKey) && (q.queryKey[0] === 'article' || q.queryKey[0] === 'articles')
            });
        },
    });
}

/**
 * Hook to toggle favorite on an article
 * Implements optimistic updates for instant UI feedback
 */
export function useToggleFavorite(articleId: string) {
    const queryClient = useQueryClient();
    const { token } = useAuth();
    const router = useRouter();

    return useMutation({
        mutationFn: async () => {
            if (!token) {
                router.push('/auth/login');
                throw new Error('Authentication required');
            }

            const { data } = await api.post('/articles/favorites/toggle/', {
                article_id: articleId
            });
            return data;
        },
        onMutate: async () => {
            // Cancel outgoing refetches broadly
            await queryClient.cancelQueries({
                predicate: (q) => Array.isArray(q.queryKey) && (q.queryKey[0] === 'article' || q.queryKey[0] === 'articles' || q.queryKey[0] === 'favorites')
            });

            // Snapshot previous value
            const previousArticle = queryClient.getQueryData(['article', articleId]);

            // Optimistically update
            queryClient.setQueryData(['article', articleId], (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    is_favorited: !old.is_favorited,
                };
            });
            // Optimistically update any 'article' detail cache by matching id
            queryClient.getQueryCache().findAll({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'article' })
                .forEach((q) => {
                    const key = q.queryKey;
                    queryClient.setQueryData(key, (old: any) => {
                        if (!old || old.id !== articleId) return old;
                        return {
                            ...old,
                            is_favorited: !old.is_favorited,
                        };
                    });
                });

            // Update articles list variants
            queryClient.getQueryCache().findAll({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'articles' })
                .forEach((q) => {
                    const key = q.queryKey;
                    queryClient.setQueryData(key, (old: any) => {
                        if (!old) return old;
                        if (Array.isArray(old)) {
                            return old.map((article: any) =>
                                article.id === articleId ? { ...article, is_favorited: !article.is_favorited } : article
                            );
                        }
                        if (old?.results) {
                            return {
                                ...old,
                                results: old.results.map((article: any) =>
                                    article.id === articleId ? { ...article, is_favorited: !article.is_favorited } : article
                                ),
                            };
                        }
                        if (old?.items) {
                            return {
                                ...old,
                                items: old.items.map((article: any) =>
                                    article.id === articleId ? { ...article, is_favorited: !article.is_favorited } : article
                                ),
                            };
                        }
                        return old;
                    });
                });

            return { previousArticle };
        },
        onError: (err, variables, context) => {
            // Rollback on error
            if (context?.previousArticle) {
                queryClient.setQueryData(['article', articleId], context.previousArticle);
            }
            queryClient.invalidateQueries({
                predicate: (q) => Array.isArray(q.queryKey) && (q.queryKey[0] === 'articles' || q.queryKey[0] === 'favorites')
            });
        },
        onSuccess: () => {
            // Invalidate to ensure consistency
            queryClient.invalidateQueries({
                predicate: (q) => Array.isArray(q.queryKey) && (q.queryKey[0] === 'article' || q.queryKey[0] === 'articles' || q.queryKey[0] === 'favorites')
            });
        },
    });
}

/**
 * Hook to fetch user's favorited articles
 */
export function useUserFavorites() {
    const { token } = useAuth();

    return useQuery({
        queryKey: ['favorites'],
        queryFn: async () => {
            const { data } = await api.get<PaginatedResponse<Article>>('/articles/favorites/');
            return data;
        },
        enabled: !!token,
        staleTime: 5 * 60 * 1000,      // 5 minutes
        gcTime: 10 * 60 * 1000,     // 10 minutes
        refetchOnWindowFocus: false,
    });
}

/**
 * Hook to fetch user's liked articles
 */
export function useUserLikes() {
    const { token } = useAuth();

    return useQuery({
        queryKey: ['likes'],
        queryFn: async () => {
            const { data } = await api.get<PaginatedResponse<Article>>('/articles/likes/');
            return data;
        },
        enabled: !!token,
        staleTime: 5 * 60 * 1000,      // 5 minutes
        gcTime: 10 * 60 * 1000,     // 10 minutes
        refetchOnWindowFocus: false,
    });
}
