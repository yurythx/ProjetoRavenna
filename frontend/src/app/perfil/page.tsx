'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { AvatarUpload } from '@/components/AvatarUpload';
import { User, Mail, AtSign, Calendar, Save, ArrowLeft, Bookmark, Heart, Grid } from 'lucide-react';
import { useUserFavorites, useUserLikes } from '@/hooks/useLikes';
import { ArticleCard } from '@/components/ArticleCard';
import { SkeletonCard } from '@/components/SkeletonCard';
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
    const [activeTab, setActiveTab] = useState<'info' | 'favorites' | 'likes'>('info');

    const { data: favorites, isLoading: favLoading } = useUserFavorites();
    const { data: likes, isLoading: likesLoading } = useUserLikes();

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
                    <div>
                        <h1 className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>
                            Meu Perfil
                        </h1>
                        <p style={{ color: 'var(--muted-foreground)' }}>
                            Gerencie suas interações e informações
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b mb-8 overflow-x-auto scrollbar-hide" style={{ borderColor: 'var(--border)' }}>
                    <button
                        onClick={() => setActiveTab('info')}
                        className={`px-6 py-3 font-medium transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === 'info' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <User className="w-4 h-4" /> Perfil
                    </button>
                    <button
                        onClick={() => setActiveTab('favorites')}
                        className={`px-6 py-3 font-medium transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === 'favorites' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <Bookmark className="w-4 h-4" /> Favoritos {favorites?.count > 0 && `(${favorites.count})`}
                    </button>
                    <button
                        onClick={() => setActiveTab('likes')}
                        className={`px-6 py-3 font-medium transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === 'likes' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <Heart className="w-4 h-4" /> Curtidas {likes?.count > 0 && `(${likes.count})`}
                    </button>
                </div>

                {/* Tab Content: Info */}
                {activeTab === 'info' && (
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
                            <div className="pt-4">
                                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
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
                )}

                {/* Tab Content: Favorites */}
                {activeTab === 'favorites' && (
                    <div className="space-y-6">
                        {favLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <SkeletonCard />
                                <SkeletonCard />
                            </div>
                        ) : !favorites?.results?.length ? (
                            <div className="text-center py-12 card p-8">
                                <Bookmark className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                                <h3 className="text-xl font-semibold mb-2">Nenhum favorito</h3>
                                <p className="text-muted-foreground mb-6">Você ainda não salvou nenhum artigo para ler depois.</p>
                                <Link href="/artigos" className="btn btn-primary inline-flex">Explorar Artigos</Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {favorites.results.map((article: any) => (
                                    <ArticleCard key={article.id} article={article} />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Tab Content: Likes */}
                {activeTab === 'likes' && (
                    <div className="space-y-6">
                        {likesLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <SkeletonCard />
                                <SkeletonCard />
                            </div>
                        ) : !likes?.results?.length ? (
                            <div className="text-center py-12 card p-8">
                                <Heart className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                                <h3 className="text-xl font-semibold mb-2">Nenhuma curtida</h3>
                                <p className="text-muted-foreground mb-6">Você ainda não curtiu nenhum artigo.</p>
                                <Link href="/artigos" className="btn btn-primary inline-flex">Explorar Artigos</Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {likes.results.map((article: any) => (
                                    <ArticleCard key={article.id} article={article} />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
