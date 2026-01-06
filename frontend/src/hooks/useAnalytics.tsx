/**
 * React Query hooks for Article Analytics
 * 
 * Features:
 * - Track article views with privacy controls
 * - Fetch article statistics
 * - Dashboard analytics for authors/admins
 * - Reading progress tracking
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Types

export interface ArticleStats {
    view_count: number;
    unique_views: number;
    reading_time: number;
    engagement_rate: number;
    like_count: number;
    comment_count: number;
}

export interface DashboardAnalytics {
    total_views: number;
    total_articles: number;
    recent_views: number;
    average_views: number;
    top_articles: TopArticle[];
}

export interface TopArticle {
    id: string;
    title: string;
    slug: string;
    views: number;
    unique_views: number;
    engagement_rate: number;
}

export interface TrackViewPayload {
    reading_progress?: number;
    time_spent?: number;
}

export interface TrackViewResponse {
    tracked: boolean;
    unique: boolean;
    message: string;
}

// Hooks

/**
 * Track article view
 * 
 * @param articleId - Article UUID
 * @returns Mutation for tracking views
 * 
 * @example
 * const { mutate: trackView } = useTrackView(articleId);
 * 
 * // Track simple view
 * trackView();
 * 
 * // Track with progress
 * trackView({ reading_progress: 50, time_spent: 120 });
 */
export const useTrackView = (articleId: string) => {
    const queryClient = useQueryClient();

    return useMutation<TrackViewResponse, Error, TrackViewPayload>({
        mutationFn: async (payload: TrackViewPayload = {}) => {
            const { data } = await api.post<TrackViewResponse>(
                `/articles/analytics/${articleId}/track_view/`,
                payload
            );
            return data;
        },
        onSuccess: () => {
            // Invalidate related queries to refresh counts
            queryClient.invalidateQueries({ queryKey: ['article-stats', articleId] });
            queryClient.invalidateQueries({ queryKey: ['article', articleId] });
            queryClient.invalidateQueries({ queryKey: ['articles'] });
        },
    });
};

/**
 * Get article statistics
 * 
 * @param articleId - Article UUID
 * @param enabled - Whether to enable the query (default: true)
 * @returns Query with article statistics
 * 
 * @example
 * const { data: stats } = useArticleStats(articleId);
 * console.log(stats?.view_count); // 1234
 */
export const useArticleStats = (articleId: string, enabled: boolean = true) => {
    return useQuery<ArticleStats, Error>({
        queryKey: ['article-stats', articleId],
        queryFn: async () => {
            const { data } = await api.get<ArticleStats>(
                `/articles/analytics/${articleId}/stats/`
            );
            return data;
        },
        enabled,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    });
};

/**
 * Get dashboard analytics
 * 
 * @returns Query with dashboard analytics data
 * 
 * @example
 * const { data: analytics } = useDashboardAnalytics();
 * console.log(analytics?.total_views); // 12345
 */
export const useDashboardAnalytics = () => {
    return useQuery<DashboardAnalytics, Error>({
        queryKey: ['dashboard-analytics'],
        queryFn: async () => {
            const { data } = await api.get<DashboardAnalytics>(
                '/articles/analytics/dashboard/'
            );
            return data;
        },
        staleTime: 2 * 60 * 1000, // 2 minutes
        gcTime: 5 * 60 * 1000, // 5 minutes
        retry: 1,
    });
};
