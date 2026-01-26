import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useArticles(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['articles-list'],
    queryFn: async () => {
      const { data } = await api.get('/articles/', { params });
      return data ?? [];
    },
  });
}
