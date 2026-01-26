import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type Article = Record<string, any>;

export function useArticle(slug: string, options?: { initialData?: Article }) {
  return useQuery({
    queryKey: ['article', slug],
    queryFn: async () => {
      const { data } = await api.get(`/articles/${slug}/`);
      return data as Article;
    },
    enabled: !!slug,
    initialData: options?.initialData,
  });
}
