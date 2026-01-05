import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

interface Notification {
    id: string;
    sender: {
        id: string;
        email: string;
        username: string | null;
        first_name: string;
        last_name: string;
        avatar: string | null;
    } | null;
    notification_type: string;
    title: string;
    message: string;
    link: string;
    is_read: boolean;
    read_at: string | null;
    created_at: string;
    time_ago: string;
}

interface UnreadCount {
    count: number;
}

export function useNotifications() {
    const queryClient = useQueryClient();
    const toast = useToast();

    // Get notifications
    const { data: notifications, isLoading } = useQuery<Notification[]>({
        queryKey: ['notifications'],
        queryFn: async () => {
            const { data } = await api.get('/notifications/');
            return data;
        },
        refetchInterval: 60000, // Refresh every minute
    });

    // Get unread count
    const { data: unreadData } = useQuery<UnreadCount>({
        queryKey: ['notifications-unread'],
        queryFn: async () => {
            const { data } = await api.get('/notifications/unread_count/');
            return data;
        },
        refetchInterval: 30000, // Refresh every 30s
    });

    // Mark as read
    const markAsReadMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.post(`/notifications/${id}/mark_as_read/`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
        },
    });

    // Mark all as read
    const markAllAsReadMutation = useMutation({
        mutationFn: async () => {
            await api.post('/notifications/mark_all_as_read/');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
            toast.success('Todas as notificações marcadas como lidas');
        },
    });

    return {
        notifications: notifications || [],
        unreadCount: unreadData?.count || 0,
        isLoading,
        markAsRead: markAsReadMutation.mutate,
        markAllAsRead: markAllAsReadMutation.mutate,
    };
}
