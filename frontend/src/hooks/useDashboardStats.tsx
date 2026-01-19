import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface DashboardStats {
    kpis: {
        total_users: number;
        total_articles: number;
        total_comments: number;
        published_articles: number;
        new_users_30d: number;
        new_articles_30d: number;
        new_comments_30d: number;
        total_views: number;
        unique_views: number;
        avg_reading_time: number;
        new_views_30d: number;
    };
    charts: {
        views_by_day: Array<{ date: string; count: number }>;
        articles_by_day: Array<{ date: string; count: number }>;
        users_by_day: Array<{ date: string; count: number }>;
        comments_by_day: Array<{ date: string; count: number }>;
    };
    top_articles: Array<{
        id: string;
        title: string;
        slug: string;
        views: number;
        engagement: number;
    }>;
    top_authors: Array<{
        author__email: string;
        author__first_name: string;
        author__last_name: string;
        article_count: number;
    }>;
}

export function useDashboardStats() {
    return useQuery<DashboardStats>({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            const { data } = await api.get('/stats/dashboard/');
            return data;
        },
        refetchInterval: 30000, // Auto-refresh every 30 seconds
        staleTime: 25000, // Consider data stale after 25 seconds
    });
}
