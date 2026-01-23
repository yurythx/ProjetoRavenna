'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { KPICard } from '@/components/dashboard/KPICard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Users, FileText, MessageSquare, CheckCircle, TrendingUp } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

export default function DashboardPage() {
    const t = useTranslations('Dashboard');
    const locale = useLocale();
    const router = useRouter();
    const { token } = useAuth();
    const { data: stats, isLoading, error } = useDashboardStats();

    // Redirect if not authenticated
    useEffect(() => {
        if (!token) {
            router.push('/auth/login');
        }
    }, [token, router]);

    if (!token) {
        return null; // Will redirect
    }

    if (isLoading) {
        return (
            <div className="container-custom py-12">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--accent)' }}></div>
                </div>
            </div>
        );
    }

    if (error || !stats) {
        return (
            <div className="container-custom py-12">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-red-600 mb-2">{t('errorLoading')}</h2>
                    <p className="text-muted-foreground">{t('tryLater')}</p>
                </div>
            </div>
        );
    }

    // Calculate percentage changes
    const userChangePercent = stats.kpis.total_users > 0
        ? (stats.kpis.new_users_30d / stats.kpis.total_users) * 100
        : 0;

    const articleChangePercent = stats.kpis.total_articles > 0
        ? (stats.kpis.new_articles_30d / stats.kpis.total_articles) * 100
        : 0;

    const commentChangePercent = stats.kpis.total_comments > 0
        ? (stats.kpis.new_comments_30d / stats.kpis.total_comments) * 100
        : 0;

    return (
        <div className="container-custom py-12">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
                    {t('title')}
                </h1>
                <p className="text-muted-foreground">
                    {t('subtitleShort')}
                </p>
            </div>

            {/* KPIs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <KPICard
                    title={t('totalUsers')}
                    value={stats.kpis.total_users}
                    change={userChangePercent}
                    icon={Users}
                    iconColor="#3b82f6"
                    bgColor="rgba(59, 130, 246, 0.1)"
                />
                <KPICard
                    title={t('publishedArticles')}
                    value={stats.kpis.total_articles}
                    change={articleChangePercent}
                    icon={FileText}
                    iconColor="#10b981"
                    bgColor="rgba(16, 185, 129, 0.1)"
                />
                <KPICard
                    title={t('totalComments')}
                    value={stats.kpis.total_comments}
                    change={commentChangePercent}
                    icon={MessageSquare}
                    iconColor="#8b5cf6"
                    bgColor="rgba(139, 92, 246, 0.1)"
                />
                <KPICard
                    title={t('publishedArticles')}
                    value={stats.kpis.published_articles}
                    icon={CheckCircle}
                    iconColor="#f59e0b"
                    bgColor="rgba(245, 158, 11, 0.1)"
                />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <ChartCard title={t('newArticles30d')}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={stats.charts.articles_by_day}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 12 }}
                                tickFormatter={(value) => {
                                    const date = new Date(value);
                                    return `${date.getDate()}/${date.getMonth() + 1}`;
                                }}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'var(--card-bg)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px'
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey="count"
                                stroke="#10b981"
                                strokeWidth={2}
                                dot={{ fill: '#10b981', r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title={t('newUsers30d')}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={stats.charts.users_by_day}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 12 }}
                                tickFormatter={(value) => {
                                    const date = new Date(value);
                                    return `${date.getDate()}/${date.getMonth() + 1}`;
                                }}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'var(--card-bg)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px'
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey="count"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={{ fill: '#3b82f6', r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>

            {/* Comments Chart */}
            <div className="grid grid-cols-1 gap-6 mb-8">
                <ChartCard title={t('newComments30d')}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.charts.comments_by_day}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 12 }}
                                tickFormatter={(value) => {
                                    const date = new Date(value);
                                    return `${date.getDate()}/${date.getMonth() + 1}`;
                                }}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'var(--card-bg)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px'
                                }}
                            />
                            <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>

            {/* Top Authors */}
            {stats.top_authors && stats.top_authors.length > 0 && (
                <div
                    className="rounded-xl p-6 border"
                    style={{
                        background: 'var(--card-bg)',
                        borderColor: 'var(--border)'
                    }}
                >
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
                        <TrendingUp className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                        {t('topAuthors')}
                    </h3>
                    <div className="space-y-3">
                        {stats.top_authors.map((author, index) => {
                            const name = author.author__first_name && author.author__last_name
                                ? `${author.author__first_name} ${author.author__last_name}`
                                : author.author__email;

                            return (
                                <div key={index} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--muted)' }}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                                            <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>
                                                {index + 1}
                                            </span>
                                        </div>
                                        <span className="font-medium" style={{ color: 'var(--foreground)' }}>
                                            {name}
                                        </span>
                                    </div>
                                    <span className="text-sm font-semibold" style={{ color: 'var(--muted-foreground)' }}>
                                        {author.article_count} {author.article_count === 1 ? t('article') : t('articles')}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Auto-refresh indicator */}
            <div className="mt-8 text-center">
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                    ⟳ {t('autoRefresh30')}
                </p>
            </div>
        </div>
    );
}
