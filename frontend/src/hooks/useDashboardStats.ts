import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data } = await api.get('/analytics/dashboard/');
      return data ?? { users: 0, articles: 0, views: 0, comments: 0 };
    },
  });
}
