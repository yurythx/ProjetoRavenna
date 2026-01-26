import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useSearchAutocomplete(q: string, enabled?: boolean) {
  return useQuery({
    queryKey: ['search', q],
    queryFn: async () => {
      const { data } = await api.get('/articles/', { params: { search: q } });
      return data ?? [];
    },
    enabled: enabled ?? q.length > 1,
  });
}
