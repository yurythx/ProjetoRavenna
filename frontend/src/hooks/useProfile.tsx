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
    date_joined: string;
}

interface ProfileUpdateData {
    username?: string;
    first_name?: string;
    last_name?: string;
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
            toast.success('Perfil atualizado com sucesso!');
        },
        onError: (error: any) => {
            const message = error.response?.data?.detail || 'Erro ao atualizar perfil';
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
            toast.success('Foto de perfil atualizada!');
        },
        onError: (error: any) => {
            const message = error.response?.data?.avatar?.[0] || 'Erro ao enviar foto';
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
