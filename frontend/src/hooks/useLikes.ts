import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useUserFavorites(userId?: string) {
  return useQuery({
    queryKey: ['favorites', userId],
    queryFn: async () => {
      const { data } = await api.get('/favorites/');
      return data ?? [];
    },
  });
}

export function useUserLikes(userId?: string) {
  return useQuery({
    queryKey: ['likes', userId],
    queryFn: async () => {
      const { data } = await api.get('/likes/');
      return data ?? [];
    },
  });
}
