import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get('/categories/');
      return data ?? [];
    },
  });
}
