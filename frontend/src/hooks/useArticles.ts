import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { components } from '@/types/api';

type Article = components['schemas']['Article'];

export function useArticles(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['articles', params],
    queryFn: async () => {
      const { data } = await api.get<Article[]>('/articles/posts/', { params });
      return data;
    },
    staleTime: 2 * 60 * 1000,      // 2 minutes (articles change more frequently)
    gcTime: 5 * 60 * 1000,      // 5 minutes in memory
    refetchOnWindowFocus: false,   // Don't refetch on window focus
  });
}

