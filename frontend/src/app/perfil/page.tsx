'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { AvatarUpload } from '@/components/AvatarUpload';
import { User, Mail, AtSign, Calendar, Save, ArrowLeft, Bookmark, Heart, Grid, Palette, Monitor, Sun, Moon, RotateCcw } from 'lucide-react';
import { ColorPickerGroup } from '@/components/ColorPickerGroup';
import { useUserFavorites, useUserLikes } from '@/hooks/useLikes';
import { ArticleCard } from '@/components/ArticleCard';
import { SkeletonCard } from '@/components/SkeletonCard';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';

export default function PerfilPage() {
    const t = useTranslations('Profile');
    const locale = useLocale();
    const { token, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const { profile, isLoading, updateProfile, isUpdating, uploadAvatar, isUploadingAvatar } = useProfile();

    const [formData, setFormData] = useState({
        username: '',
        first_name: '',
        last_name: '',
        bio: '',
        theme_preference: 'system' as 'light' | 'dark' | 'system',
        primary_color: '',
        secondary_color: '',
        primary_color_dark: '',
        secondary_color_dark: '',
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
                bio: profile.bio || '',
                theme_preference: profile.theme_preference || 'system',
                primary_color: profile.primary_color || '',
                secondary_color: profile.secondary_color || '',
                primary_color_dark: profile.primary_color_dark || '',
                secondary_color_dark: profile.secondary_color_dark || '',
            });
        }
    }, [profile]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateProfile(formData);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
                            {t('title')}
                        </h1>
                        <p style={{ color: 'var(--muted-foreground)' }}>
                            {t('subtitle')}
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
                        <User className="w-4 h-4" /> {t('tabProfile')}
                    </button>
                    <button
                        onClick={() => setActiveTab('favorites')}
                        className={`px-6 py-3 font-medium transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === 'favorites' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <Bookmark className="w-4 h-4" /> {t('tabFavorites')} {(favorites?.count ?? 0) > 0 && `(${favorites?.count})`}
                    </button>
                    <button
                        onClick={() => setActiveTab('likes')}
                        className={`px-6 py-3 font-medium transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === 'likes' ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <Heart className="w-4 h-4" /> {t('tabLikes')} {(likes?.count ?? 0) > 0 && `(${likes?.count})`}
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
                                {t('profilePicture')}
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
                                {t('personalInfo')}
                            </h2>

                            {/* Email (read-only) */}
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                                    <Mail className="w-4 h-4 inline mr-2" aria-hidden="true" />
                                    {t('email')}
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
                                    {t('emailNote')}
                                </p>
                            </div>

                            {/* Username */}
                            <div>
                                <label htmlFor="username" className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                                    <AtSign className="w-4 h-4 inline mr-2" aria-hidden="true" />
                                    {t('username')}
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
                                    placeholder={t('usernamePlaceholder')}
                                />
                            </div>

                            {/* First Name */}
                            <div>
                                <label htmlFor="first_name" className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                                    <User className="w-4 h-4 inline mr-2" aria-hidden="true" />
                                    {t('firstName')}
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
                                    placeholder={t('firstNamePlaceholder')}
                                />
                            </div>

                            {/* Last Name */}
                            <div>
                                <label htmlFor="last_name" className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                                    <User className="w-4 h-4 inline mr-2" aria-hidden="true" />
                                    {t('lastName')}
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
                                    placeholder={t('lastNamePlaceholder')}
                                />
                            </div>

                            {/* Bio */}
                            <div>
                                <label htmlFor="bio" className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                                    <User className="w-4 h-4 inline mr-2" aria-hidden="true" />
                                    {t('bio')}
                                </label>
                                <textarea
                                    id="bio"
                                    name="bio"
                                    rows={4}
                                    value={formData.bio}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                                    style={{
                                        background: 'var(--background)',
                                        borderColor: 'var(--border)',
                                        color: 'var(--foreground)'
                                    }}
                                    placeholder={t('bioPlaceholder')}
                                />
                                <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                                    {t('bioNote')}
                                </p>
                            </div>

                            {/* visual preferences */}
                            <div className="pt-8 space-y-6">
                                <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
                                    <Palette className="w-5 h-5 text-accent" /> {t('visualCustomization')}
                                </h2>

                                {/* Theme Preference */}
                                <div>
                                    <label className="block text-sm font-medium mb-3" style={{ color: 'var(--foreground)' }}>
                                        {t('themePreference')}
                                    </label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { id: 'light', label: t('themeLight'), icon: Sun },
                                            { id: 'dark', label: t('themeDark'), icon: Moon },
                                            { id: 'system', label: t('themeSystem'), icon: Monitor },
                                        ].map((t) => (
                                            <button
                                                key={t.id}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, theme_preference: t.id as any }))}
                                                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${formData.theme_preference === t.id
                                                    ? 'border-accent bg-accent/5'
                                                    : 'border-border bg-background hover:bg-muted/50'
                                                    }`}
                                            >
                                                <t.icon className={`w-5 h-5 ${formData.theme_preference === t.id ? 'text-accent' : 'text-muted-foreground'}`} />
                                                <span className={`text-xs font-medium ${formData.theme_preference === t.id ? 'text-accent' : 'text-foreground'}`}>
                                                    {t.label}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Colors - Light Mode */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                        <Sun className="w-4 h-4 text-amber-500" />
                                        Cores - Modo Claro
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <ColorPickerGroup
                                            label={t('primaryColor')}
                                            value={formData.primary_color}
                                            onChange={(value) => setFormData(prev => ({ ...prev, primary_color: value }))}
                                            defaultValue="#44B78B"
                                            placeholder="#44B78B"
                                            helpText={t('systemDefaultNote')}
                                        />
                                        <ColorPickerGroup
                                            label={t('secondaryColor')}
                                            value={formData.secondary_color}
                                            onChange={(value) => setFormData(prev => ({ ...prev, secondary_color: value }))}
                                            defaultValue="#2D3748"
                                            placeholder="#2D3748"
                                            helpText={t('systemDefaultNote')}
                                        />
                                    </div>
                                </div>

                                {/* Colors - Dark Mode */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                        <Moon className="w-4 h-4 text-blue-500" />
                                        Cores - Modo Escuro
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <ColorPickerGroup
                                            label={t('primaryColorDark')}
                                            value={formData.primary_color_dark}
                                            onChange={(value) => setFormData(prev => ({ ...prev, primary_color_dark: value }))}
                                            defaultValue="#44B78B"
                                            placeholder="#44B78B"
                                            helpText={t('systemDefaultNote')}
                                        />
                                        <ColorPickerGroup
                                            label={t('secondaryColorDark')}
                                            value={formData.secondary_color_dark}
                                            onChange={(value) => setFormData(prev => ({ ...prev, secondary_color_dark: value }))}
                                            defaultValue="#0C4B33"
                                            placeholder="#0C4B33"
                                            helpText={t('systemDefaultNote')}
                                        />
                                    </div>
                                </div>

                                {/* Reset Button */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (confirm(t('resetColorsConfirm'))) {
                                            setFormData(prev => ({
                                                ...prev,
                                                primary_color: '',
                                                secondary_color: '',
                                                primary_color_dark: '',
                                                secondary_color_dark: ''
                                            }));
                                        }
                                    }}
                                    className="btn btn-outline w-full flex items-center justify-center gap-2"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    {t('resetColors')}
                                </button>
                            </div>

                            {/* Member since */}
                            <div className="pt-4">
                                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
                                    <Calendar className="w-4 h-4 inline mr-2" aria-hidden="true" />
                                    {t('memberSince')}
                                </label>
                                <p style={{ color: 'var(--muted-foreground)' }}>
                                    {new Date(profile.date_joined).toLocaleDateString(locale, {
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
                                        {t('saving')}
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" aria-hidden="true" />
                                        {t('saveChanges')}
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
                                <h3 className="text-xl font-semibold mb-2">{t('noFavorites')}</h3>
                                <p className="text-muted-foreground mb-6">{t('noFavoritesDesc')}</p>
                                <Link href="/artigos" className="btn btn-primary inline-flex">{t('exploreArticles')}</Link>
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
                                <h3 className="text-xl font-semibold mb-2">{t('noLikes')}</h3>
                                <p className="text-muted-foreground mb-6">{t('noLikesDesc')}</p>
                                <Link href="/artigos" className="btn btn-primary inline-flex">{t('exploreArticles')}</Link>
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
