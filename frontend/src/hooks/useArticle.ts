import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { components } from '@/types/api';

export type Article = components['schemas']['Article'] & {
  author_name?: string;
  is_liked?: boolean;
  like_count?: number;
  is_favorited?: boolean;
  view_count?: number;
  unique_views?: number;
  reading_time?: number;
  engagement_rate?: number;
};

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

