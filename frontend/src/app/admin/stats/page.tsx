'use client';

import { useDashboardStats } from '@/hooks/useDashboardStats';
import {
    BarChart3,
    TrendingUp,
    Users,
    Eye,
    FileText,
    Calendar,
    Download,
    Filter
} from 'lucide-react';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { useMemo } from 'react';

export default function StatsPage() {
    const { data, isLoading } = useDashboardStats();
    const viewsChart = useMemo(() => data?.charts.views_by_day || [], [data]);
    const articlesChart = useMemo(() => data?.charts.articles_by_day || [], [data]);
    const usersChart = useMemo(() => data?.charts.users_by_day || [], [data]);

    const exportData = () => {
        const header = ['date', 'views', 'articles', 'users'];
        const rows = (viewsChart || []).map((v: any) => {
            const a = (articlesChart || []).find((x: any) => x.date === v.date)?.count || 0;
            const u = (usersChart || []).find((x: any) => x.date === v.date)?.count || 0;
            return [v.date, v.count, a, u];
        });
        const csv = [header, ...rows].map(r => r.join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stats-export-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if (isLoading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-12 w-64 bg-muted rounded" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-muted rounded-2xl" />)}
                </div>
                <div className="h-96 bg-muted rounded-2xl" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight">Estatísticas Avançadas</h1>
                    <p className="text-muted-foreground">Análise detalhada de desempenho e métricas de conteúdo</p>
                </div>
                <div className="flex gap-2">
                   
                    <button
                        onClick={exportData}
                        className="btn btn-outline btn-sm flex items-center gap-2"
                    >
                        <Download className="h-4 w-4" />
                        Exportar CSV
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="card p-6 hover:border-blue-500/50 transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-500/10 rounded-xl">
                            <FileText className="h-6 w-6 text-blue-500" />
                        </div>
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                    </div>
                    <h3 className="text-3xl font-bold">{data?.kpis.total_articles}</h3>
                    <p className="text-sm text-muted-foreground mt-1">Total de Artigos</p>
                </div>

                <div className="card p-6 hover:border-purple-500/50 transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-500/10 rounded-xl">
                            <Eye className="h-6 w-6 text-purple-500" />
                        </div>
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                    </div>
                    <h3 className="text-3xl font-bold">{(data?.kpis.total_views || 0).toLocaleString()}</h3>
                    <p className="text-sm text-muted-foreground mt-1">Total de Visualizações</p>
                </div>

                <div className="card p-6 hover:border-emerald-500/50 transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-emerald-500/10 rounded-xl">
                            <Users className="h-6 w-6 text-emerald-500" />
                        </div>
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                    </div>
                    <h3 className="text-3xl font-bold">{data ? (data.kpis.total_users || 0) : 0}</h3>
                    <p className="text-sm text-muted-foreground mt-1">Usuários</p>
                </div>

                <div className="card p-6 hover:border-amber-500/50 transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-amber-500/10 rounded-xl">
                            <BarChart3 className="h-6 w-6 text-amber-500" />
                        </div>
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                    </div>
                    <h3 className="text-3xl font-bold">{data ? `${(data.kpis.avg_reading_time || 0)} min` : '0 min'}</h3>
                    <p className="text-sm text-muted-foreground mt-1">Tempo médio de leitura</p>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Views by Month */}
                <div className="card p-6">
                    <h3 className="font-bold text-lg mb-6">Visualizações por Dia</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height={300} minHeight={300}>
                            <LineChart data={viewsChart}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                                <Line type="monotone" dataKey="count" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Articles by Category */}
                <div className="card p-6">
                    <h3 className="font-bold text-lg mb-6">Artigos por Dia</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height={300} minHeight={300}>
                            <BarChart data={articlesChart}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                                <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Articles */}
                <div className="card p-6">
                    <h3 className="font-bold text-lg mb-4">Artigos Mais Visualizados</h3>
                    <div className="space-y-3">
                        {data?.top_articles.map((article, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{article.title}</p>
                                    <p className="text-xs text-muted-foreground">/{article.slug}</p>
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-bold">{article.views.toLocaleString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Users by Day */}
                <div className="card p-6">
                    <h3 className="font-bold text-lg mb-4">Novos Usuários por Dia</h3>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={usersChart}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                                <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
