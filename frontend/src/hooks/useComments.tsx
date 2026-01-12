import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

interface Comment {
    id: string;
    article: string;
    author: {
        id: string;
        email: string;
        username: string | null;
        first_name: string;
        last_name: string;
        avatar: string | null;
    };
    parent: string | null;
    content: string;
    created_at: string;
    is_reply: boolean;
    replies_count: number;
    can_delete: boolean;
    is_approved?: boolean;
    replies?: Comment[];
}

interface CreateCommentData {
    article: string;
    content: string;
    parent?: string | null;
    guest_name?: string;
    guest_email?: string;
    guest_phone?: string;
    captcha?: string;
}

export function useComments(articleId?: string) {
    const queryClient = useQueryClient();
    const toast = useToast();

    // Get comments for article
    const { data: comments, isLoading, error } = useQuery({
        queryKey: ['comments', articleId],
        queryFn: async () => {
            if (!articleId) return [];
            const { data } = await api.get<Comment[]>(`/articles/comments/?article=${articleId}&parent_only=true`);
            return data;
        },
        enabled: !!articleId,
        staleTime: 1 * 60 * 1000,      // 1 minute (comments update frequently)
        gcTime: 5 * 60 * 1000,      // 5 minutes
        refetchOnWindowFocus: false,   // Don't refetch on focus
    });

    // Create comment
    const createCommentMutation = useMutation({
        mutationFn: async (commentData: CreateCommentData) => {
            const { data } = await api.post('/articles/comments/', commentData);
            return data;
        },
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ['comments', articleId] });
            const approved = !!data?.is_approved;
            toast.success(approved ? 'Comentário enviado!' : 'Comentário enviado e aguardando aprovação');
        },
        onError: (error: any) => {
            const message = error.response?.data?.detail || 'Erro ao enviar comentário';
            toast.error(message);
        },
    });

    // Delete comment
    const deleteCommentMutation = useMutation({
        mutationFn: async (commentId: string) => {
            await api.delete(`/articles/comments/${commentId}/`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['comments', articleId] });
            toast.success('Comentário deletado');
        },
        onError: (error: any) => {
            const message = error.response?.data?.detail || 'Erro ao deletar comentário';
            toast.error(message);
        },
    });

    return {
        comments: comments || [],
        isLoading,
        error,
        createComment: createCommentMutation.mutate,
        isCreating: createCommentMutation.isPending,
        deleteComment: deleteCommentMutation.mutate,
        isDeleting: deleteCommentMutation.isPending,
    };
}
