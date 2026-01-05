'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { AvatarUpload } from '@/components/AvatarUpload';
import { User, Mail, AtSign, Calendar, Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function PerfilPage() {
    const { token, loading: authLoading } = useAuth();
    const router = useRouter();
    const { profile, isLoading, updateProfile, isUpdating, uploadAvatar, isUploadingAvatar } = useProfile();

    const [formData, setFormData] = useState({
        username: '',
        first_name: '',
        last_name: '',
    });

    // Redirect if not authenticated
    useEffect(() => {
        if (!authLoading && !token) {
            router.push('/auth/login');
        }
    }, [token, authLoading, router]);

    // Load profile data into form
    useEffect(() => {
        if (profile) {
            setFormData({
                username: profile.username || '',
                first_name: profile.first_name || '',
                last_name: profile.last_name || '',
            });
        }
    }, [profile]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateProfile(formData);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--accent)' }}></div>
            </div>
        );
    }

    if (!profile) {
        return null;
    }

    return (
        <div className="min-h-screen py-12" style={{ background: 'var(--background)' }}>
            <div className="container-custom max-w-2xl">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link
                        href="/"
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                        aria-label="Voltar"
                    >
                        <ArrowLeft className="w-5 h-5" style={{ color: 'var(--foreground)' }} />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>
                            Meu Perfil
                        </h1>
                        <p style={{ color: 'var(--muted-foreground)' }}>
                            Gerencie suas informações pessoais
                        </p>
                    </div>
                </div>

                {/* Card */}
                <div
                    className="rounded-xl p-8 shadow-lg"
                    style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
                >
                    {/* Avatar Upload */}
                    <div className="mb-8">
                        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
                            Foto de Perfil
                        </h2>
                        <AvatarUpload
                            currentAvatar={profile.avatar}
                            onUpload={uploadAvatar}
                            isUploading={isUploadingAvatar}
                        />
                    </div>

                    {/* Divider */}
                    <div className="my-8 border-t" style={{ borderColor: 'var(--border)' }}></div>

                    {/* Profile Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
                            Informações Pessoais
                        </h2>

                        {/* Email (read-only) */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                                <Mail className="w-4 h-4 inline mr-2" aria-hidden="true" />
                                E-mail
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={profile.email}
                                disabled
                                className="w-full px-4 py-2 rounded-lg border opacity-60 cursor-not-allowed"
                                style={{
                                    background: 'var(--muted)',
                                    borderColor: 'var(--border)',
                                    color: 'var(--foreground)'
                                }}
                            />
                            <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                                O e-mail não pode ser alterado
                            </p>
                        </div>

                        {/* Username */}
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                                <AtSign className="w-4 h-4 inline mr-2" aria-hidden="true" />
                                Nome de usuário
                            </label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                value={formData.username}
                                onChange={handleChange}
                                className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-accent"
                                style={{
                                    background: 'var(--background)',
                                    borderColor: 'var(--border)',
                                    color: 'var(--foreground)'
                                }}
                                placeholder="seu_usuario"
                            />
                        </div>

                        {/* First Name */}
                        <div>
                            <label htmlFor="first_name" className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                                <User className="w-4 h-4 inline mr-2" aria-hidden="true" />
                                Primeiro Nome
                            </label>
                            <input
                                id="first_name"
                                name="first_name"
                                type="text"
                                value={formData.first_name}
                                onChange={handleChange}
                                className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-accent"
                                style={{
                                    background: 'var(--background)',
                                    borderColor: 'var(--border)',
                                    color: 'var(--foreground)'
                                }}
                                placeholder="João"
                            />
                        </div>

                        {/* Last Name */}
                        <div>
                            <label htmlFor="last_name" className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                                <User className="w-4 h-4 inline mr-2" aria-hidden="true" />
                                Sobrenome
                            </label>
                            <input
                                id="last_name"
                                name="last_name"
                                type="text"
                                value={formData.last_name}
                                onChange={handleChange}
                                className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-accent"
                                style={{
                                    background: 'var(--background)',
                                    borderColor: 'var(--border)',
                                    color: 'var(--foreground)'
                                }}
                                placeholder="Silva"
                            />
                        </div>

                        {/* Member since */}
                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                                <Calendar className="w-4 h-4 inline mr-2" aria-hidden="true" />
                                Membro desde
                            </label>
                            <p style={{ color: 'var(--muted-foreground)' }}>
                                {new Date(profile.date_joined).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: 'long',
                                    year: 'numeric'
                                })}
                            </p>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isUpdating}
                            className="btn btn-primary w-full flex items-center justify-center gap-2"
                        >
                            {isUpdating ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" aria-hidden="true" />
                                    Salvar Alterações
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
