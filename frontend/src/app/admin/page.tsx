'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
    Users,
    BookOpen,
    Eye,
    MousePointer2,
    Clock,
    TrendingUp,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';

interface DashboardData {
    kpis: {
        total_users: number;
        total_articles: number;
        total_views: number;
        unique_views: number;
        avg_engagement: number;
        avg_reading_time: number;
        new_articles_30d: number;
        new_views_30d: number;
    };
    charts: {
        views_by_day: Array<{ date: string; count: number }>;
        articles_by_day: Array<{ date: string; count: number }>;
    };
    top_articles: Array<{
        id: string;
        title: string;
        views: number;
        engagement: number;
        slug: string;
    }>;
}

export default function AdminDashboard() {
    const t = useTranslations('Dashboard');
    const locale = useLocale();
    const { data, isLoading } = useQuery<DashboardData>({
        queryKey: ['admin-stats'],
        queryFn: async () => {
            const resp = await api.get('/stats/dashboard/');
            return resp.data;
        },
        refetchInterval: 60000, // Update every minute
    });

    if (isLoading) return <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-muted rounded-2xl" />)}
        </div>
        <div className="h-96 bg-muted rounded-2xl" />
    </div>;

    const kpis = [
        { label: t('totalReaders'), value: data?.kpis.total_users, icon: Users, color: 'text-accent', bg: 'bg-accent/10' },
        { label: t('publishedArticles'), value: data?.kpis.total_articles, icon: BookOpen, color: 'text-accent', bg: 'bg-accent/10' },
        { label: t('views'), value: data?.kpis.total_views, icon: Eye, color: 'text-warning', bg: 'bg-warning-soft' },
        { label: t('avgEngagement'), value: `${data?.kpis.avg_engagement}%`, icon: MousePointer2, color: 'text-success', bg: 'bg-success-soft' },
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight">{t('title')}</h1>
                <p className="text-muted-foreground">{t('subtitle')}</p>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpis.map((kpi, i) => (
                    <div key={i} className="card p-6 bg-card border-border hover:border-accent/50 transition-all group overflow-hidden relative">
                        <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full ${kpi.bg} blur-3xl opacity-50 group-hover:opacity-100 transition-opacity`} />
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-2 rounded-lg ${kpi.bg}`}>
                                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                            </div>
                            <TrendingUp className="h-4 w-4 text-muted-foreground opacity-30" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
                            <h3 className="text-2xl font-bold">{kpi.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
                <div className="card p-6 min-h-[400px]">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            {t('dailyViews')}
                            <span className="badge badge-accent-soft">{t('days30')}</span>
                        </h3>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data?.charts.views_by_day}>
                                <defs>
                                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                                    tickFormatter={(val) => new Date(val).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
                                />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
                                <Tooltip
                                    contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px' }}
                                />
                                <Area type="monotone" dataKey="count" stroke="var(--accent)" strokeWidth={2} fillOpacity={1} fill="url(#colorViews)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Articles */}
                <div className="card p-6 space-y-6">
                    <h3 className="font-bold text-lg">{t('trendingContent')}</h3>
                    <div className="space-y-4">
                        {data?.top_articles.map((art, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted transition-colors border border-transparent hover:border-border">
                                <div className="min-w-0 flex-1 pr-4">
                                    <p className="font-medium text-sm truncate">{art.title}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="badge badge-success-soft">{t('engagement')}: {art.engagement}%</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold flex items-center gap-1">
                                        {art.views} <Eye className="h-3 w-3 opacity-50" />
                                    </div>
                                    <div className="text-[10px] text-success font-medium">+12%</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
