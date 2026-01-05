import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { components } from '@/types/api';

type Tag = components['schemas']['Tag'];

export function useTags(params?: Record<string, unknown>) {
  return useQuery<Tag[]>({
    queryKey: ['tags', params],
    queryFn: async () => {
      const { data } = await api.get('/articles/tags/', { params });
      return data;
    },
  });
}

