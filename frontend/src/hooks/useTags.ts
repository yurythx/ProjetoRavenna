import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Tag {
    id: string;
    name: string;
    slug: string;
    description?: string;
    color: string;
    article_count: number;
    created_at: string;
    updated_at: string;
}

export interface TagWithArticles {
    tag: Tag;
    articles: any[];
    count: number;
}

/**
 * Hook to fetch all tags
 */
export function useTags(searchQuery?: string) {
    return useQuery({
        queryKey: ['tags', searchQuery],
        queryFn: async () => {
            const params = searchQuery ? { search: searchQuery } : {};
            const { data } = await api.get<Tag[]>('/articles/tags/', { params });
            return data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        cacheTime: 10 * 60 * 1000, // 10 minutes  
        refetchOnWindowFocus: false, // Don't refetch on window focus
    });
}

/**
 * Hook to fetch popular tags (top 10)
 */
export function usePopularTags() {
    return useQuery({
        queryKey: ['tags', 'popular'],
        queryFn: async () => {
            const { data } = await api.get<Tag[]>('/articles/tags/popular/');
            return data;
        },
    });
}

/**
 * Hook to fetch a single tag by slug
 */
export function useTag(slug: string) {
    return useQuery({
        queryKey: ['tags', slug],
        queryFn: async () => {
            const { data } = await api.get<Tag>(`/articles/tags/${slug}/`);
            return data;
        },
        enabled: !!slug,
    });
}

/**
 * Hook to fetch articles by tag
 */
export function useArticlesByTag(slug: string) {
    return useQuery({
        queryKey: ['tags', slug, 'articles'],
        queryFn: async () => {
            const { data } = await api.get<TagWithArticles>(`/articles/tags/${slug}/articles/`);
            return data;
        },
        enabled: !!slug,
    });
}

/**
 * Hook to create a new tag (admin only)
 */
export function useCreateTag() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payload: { name: string; description?: string; color?: string }) => {
            const { data } = await api.post<Tag>('/articles/tags/', payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tags'] });
        },
    });
}

/**
 * Hook to update a tag (admin only)
 */
export function useUpdateTag() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ slug, data: payload }: { slug: string; data: Partial<Tag> }) => {
            const { data } = await api.patch<Tag>(`/articles/tags/${slug}/`, payload);
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['tags'] });
            queryClient.invalidateQueries({ queryKey: ['tags', variables.slug] });
        },
    });
}

/**
 * Hook to delete a tag (admin only)
 */
export function useDeleteTag() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (slug: string) => {
            await api.delete(`/articles/tags/${slug}/`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tags'] });
        },
    });
}
