import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { components } from '@/types/api';

type Article = components['schemas']['Article'] & { author_name?: string };

export function useArticle(slug: string, options?: { initialData?: Article }) {
  return useQuery<Article>({
    queryKey: ['article', slug],
    queryFn: async () => {
      const { data } = await api.get(`/articles/posts/${slug}/`);
      return data;
    },
    initialData: options?.initialData,
  });
}

