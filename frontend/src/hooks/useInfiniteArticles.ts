import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useInfiniteArticles(params?: Record<string, any>) {
  return useInfiniteQuery({
    queryKey: ['articles'],
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await api.get(`/articles/`, { params: { ...params, page: pageParam } });
      return data ?? { results: [], next: null };
    },
    getNextPageParam: (lastPage: any) => lastPage?.next ?? undefined,
    select: (data: any) => {
      const items = Array.isArray(data?.pages)
        ? data.pages.flatMap((p: any) => p?.results ?? p ?? [])
        : [];
      return { items };
    },
  });
}
