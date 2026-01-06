import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { components } from '@/types/api';

type Article = components['schemas']['Article'];

export interface SearchFilters {
    query?: string;
    tags?: string[];
    category?: string;
    author?: string;
    date_from?: string;
    date_to?: string;
    ordering?: 'relevance' | '-created_at' | 'created_at';
    page?: number;
}

export interface SearchResult extends Article {
    rank?: number;
    headline?: string;
}

export interface SearchResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: SearchResult[];
}

export interface AutocompleteResult {
    id: string;
    title: string;
    slug: string;
}

/**
 * Hook for searching articles with filters
 */
export function useSearch(filters: SearchFilters) {
    const { query, tags, category, author, date_from, date_to, ordering = 'relevance', page = 1 } = filters;

    return useQuery({
        queryKey: ['search', query, tags, category, author, date_from, date_to, ordering, page],
        queryFn: async () => {
            const params = new URLSearchParams();

            if (query) params.append('q', query);
            if (tags && tags.length > 0) {
                tags.forEach(tag => params.append('tags', tag));
            }
            if (category) params.append('category', category);
            if (author) params.append('author', author);
            if (date_from) params.append('date_from', date_from);
            if (date_to) params.append('date_to', date_to);
            if (ordering) params.append('ordering', ordering);
            params.append('page', page.toString());

            const { data } = await api.get<SearchResponse>(`/articles/search/?${params.toString()}`);
            return data;
        },
        enabled: !!(query || tags?.length || category || author || date_from || date_to),
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    });
}

/**
 * Hook for autocomplete suggestions
 */
export function useSearchAutocomplete(query: string, enabled = true) {
    return useQuery({
        queryKey: ['search-autocomplete', query],
        queryFn: async () => {
            if (!query || query.length < 2) {
                return { results: [] };
            }

            const { data } = await api.get<{ results: AutocompleteResult[] }>(
                `/articles/search/autocomplete/?q=${encodeURIComponent(query)}`
            );
            return data;
        },
        enabled: enabled && query.length >= 2,
        staleTime: 1000 * 60 * 2, // Cache for 2 minutes
    });
}

/**
 * Hook for search statistics
 */
export function useSearchStats(filters: SearchFilters) {
    const { query, tags, category, author, date_from, date_to } = filters;

    return useQuery({
        queryKey: ['search-stats', query, tags, category, author, date_from, date_to],
        queryFn: async () => {
            const params = new URLSearchParams();

            if (query) params.append('q', query);
            if (tags && tags.length > 0) {
                tags.forEach(tag => params.append('tags', tag));
            }
            if (category) params.append('category', category);
            if (author) params.append('author', author);
            if (date_from) params.append('date_from', date_from);
            if (date_to) params.append('date_to', date_to);

            const { data } = await api.get(`/articles/search/stats/?${params.toString()}`);
            return data;
        },
        enabled: !!(query || tags?.length || category),
    });
}
