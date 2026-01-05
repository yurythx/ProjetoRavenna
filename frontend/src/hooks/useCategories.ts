import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { components } from '@/types/api';

type Category = components['schemas']['Category'];

export function useCategories(params?: Record<string, unknown>) {
  return useQuery<Category[]>({
    queryKey: ['categories', params],
    queryFn: async () => {
      const { data } = await api.get('/articles/categories/', { params });
      return data;
    },
  });
}

