import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

interface UserProfile {
    id: string;
    email: string;
    username: string | null;
    first_name: string;
    last_name: string;
    avatar: string | null;
    bio?: string;
    date_joined: string;
    theme_preference: 'light' | 'dark' | 'system';
    primary_color?: string;
    secondary_color?: string;
    primary_color_dark?: string;
    secondary_color_dark?: string;
}

interface ProfileUpdateData {
    username?: string;
    first_name?: string;
    last_name?: string;
    bio?: string;
    theme_preference?: 'light' | 'dark' | 'system';
    primary_color?: string;
    secondary_color?: string;
    primary_color_dark?: string;
    secondary_color_dark?: string;
}

export function useProfile() {
    const queryClient = useQueryClient();
    const toast = useToast();

    // Get profile
    const { data: profile, isLoading, error } = useQuery<UserProfile>({
        queryKey: ['profile'],
        queryFn: async () => {
            const { data } = await api.get('/auth/profile/');
            return data;
        },
        retry: false,
    });

    // Update profile
    const updateProfileMutation = useMutation({
        mutationFn: async (data: ProfileUpdateData) => {
            const { data: response } = await api.patch('/auth/profile/', data);
            return response;
        },
        onSuccess: (data) => {
            queryClient.setQueryData(['profile'], data);
            toast.success('Seus dados foram atualizados!');
        },
        onError: (error: any) => {
            const message = error.response?.data?.detail || 'Não foi possível atualizar o perfil';
            toast.error(message);
        },
    });

    // Upload avatar
    const uploadAvatarMutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append('avatar', file);
            const { data } = await api.post('/auth/profile/avatar/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return data;
        },
        onSuccess: (data) => {
            queryClient.setQueryData(['profile'], data);
            toast.success('Sua foto de perfil foi atualizada!');
        },
        onError: (error: any) => {
            const message = error.response?.data?.avatar?.[0] || 'Não foi possível enviar a foto';
            toast.error(message);
        },
    });

    return {
        profile,
        isLoading,
        error,
        updateProfile: updateProfileMutation.mutate,
        isUpdating: updateProfileMutation.isPending,
        uploadAvatar: uploadAvatarMutation.mutate,
        isUploadingAvatar: uploadAvatarMutation.isPending,
    };
}
