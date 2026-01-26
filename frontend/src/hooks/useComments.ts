import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useComments(slug: string) {
  const q = useQuery({
    queryKey: ['comments', slug],
    queryFn: async () => {
      const { data } = await api.get(`/articles/${slug}/comments/`);
      return data ?? [];
    },
    enabled: !!slug,
  });
  const createComment = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post(`/articles/${slug}/comments/`, payload);
      return data;
    },
  });
  const deleteComment = useMutation({
    mutationFn: async (id: any) => {
      await api.delete(`/articles/${slug}/comments/${id}/`);
    },
  });
  return {
    comments: q.data ?? [],
    isLoading: q.isLoading,
    createComment: (payload: any) => createComment.mutate(payload),
    isCreating: createComment.isPending,
    deleteComment: (id: any) => deleteComment.mutate(id),
  };
}
