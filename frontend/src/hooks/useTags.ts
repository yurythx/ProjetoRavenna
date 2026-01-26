import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type Tag = { id: string; name: string; slug?: string };
export function useTags(search?: string) {
  return useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const { data } = await api.get('/tags/', { params: { search } });
      return data ?? [];
    },
  });
}
