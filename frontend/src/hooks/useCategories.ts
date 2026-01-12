import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { components } from '@/types/api';

type Category = components['schemas']['Category'];

export function useCategories(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['categories', params],
    queryFn: async () => {
      const { data } = await api.get<Category[]>('/articles/categories/', { params });
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
}
