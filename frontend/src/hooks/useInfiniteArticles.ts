import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { components } from '@/types/api';

type Article = components['schemas']['Article'];

type PageShape =
  | { results: Article[]; next?: string | null }
  | Article[];

function normalize(page: PageShape): { items: Article[]; nextPage: number | null } {
  if (Array.isArray(page)) return { items: page, nextPage: null };
  const nextUrl = page.next || null;
  if (!nextUrl) return { items: page.results, nextPage: null };
  try {
    const u = new URL(nextUrl);
    const p = u.searchParams.get('page');
    return { items: page.results, nextPage: p ? Number(p) : null };
  } catch {
    return { items: page.results, nextPage: null };
  }
}

export function useInfiniteArticles(params?: Record<string, unknown>) {
  return useInfiniteQuery({
    queryKey: ['articles', 'infinite', params],
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await api.get('/articles/posts/', {
        params: { ...params, page: pageParam },
      });
      return data as PageShape;
    },
    getNextPageParam: (lastPage) => normalize(lastPage).nextPage,
    select: (data) => {
      const all = data.pages.flatMap((p) => normalize(p).items);
      return { items: all, pageParams: data.pageParams, pages: data.pages };
    },
  });
}

