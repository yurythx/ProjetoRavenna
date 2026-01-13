'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
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
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import { useState } from 'react';

interface StatsData {
    overview: {
        total_articles: number;
        total_views: number;
        total_authors: number;
        avg_engagement: number;
    };
    articles_by_category: Array<{ category: string; count: number }>;
    views_by_month: Array<{ month: string; views: number }>;
    top_articles: Array<{ title: string; views: number; slug: string }>;
    top_authors: Array<{ name: string; articles: number; total_views: number }>;
}

const COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export default function StatsPage() {
    const [timeRange, setTimeRange] = useState('30');

    const { data: stats, isLoading } = useQuery<StatsData>({
        queryKey: ['advanced-stats', timeRange],
        queryFn: async () => {
            // Mock data - replace with real API call
            return {
                overview: {
                    total_articles: 45,
                    total_views: 12543,
                    total_authors: 8,
                    avg_engagement: 67.5
                },
                articles_by_category: [
                    { category: 'Tecnologia', count: 15 },
                    { category: 'Negócios', count: 12 },
                    { category: 'Lifestyle', count: 8 },
                    { category: 'Educação', count: 6 },
                    { category: 'Saúde', count: 4 },
                ],
                views_by_month: [
                    { month: 'Jan', views: 890 },
                    { month: 'Fev', views: 1240 },
                    { month: 'Mar', views: 1567 },
                    { month: 'Abr', views: 1890 },
                    { month: 'Mai', views: 2234 },
                    { month: 'Jun', views: 2543 },
                ],
                top_articles: [
                    { title: 'Introdução ao Next.js 14', views: 2340, slug: 'intro-nextjs' },
                    { title: 'Python para Iniciantes', views: 1890, slug: 'python-beginners' },
                    { title: 'Design Patterns em React', views: 1654, slug: 'react-patterns' },
                    { title: 'Node.js Best Practices', views: 1432, slug: 'nodejs-practices' },
                    { title: 'TypeScript Avançado', views: 1234, slug: 'typescript-advanced' },
                ],
                top_authors: [
                    { name: 'João Silva', articles: 12, total_views: 5430 },
                    { name: 'Maria Santos', articles: 10, total_views: 4890 },
                    { name: 'Pedro Costa', articles: 8, total_views: 3200 },
                    { name: 'Ana Oliveira', articles: 7, total_views: 2980 },
                    { name: 'Lucas Pereira', articles: 5, total_views: 2100 },
                ],
            };
        },
    });

    const exportData = () => {
        const csv = 'Category,Count\n' +
            stats?.articles_by_category.map(item => `${item.category},${item.count}`).join('\n');

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
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        className="px-4 py-2 rounded-lg border border-border bg-background text-sm"
                    >
                        <option value="7">Últimos 7 dias</option>
                        <option value="30">Últimos 30 dias</option>
                        <option value="90">Últimos 90 dias</option>
                        <option value="365">Último ano</option>
                    </select>
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
                    <h3 className="text-3xl font-bold">{stats?.overview.total_articles}</h3>
                    <p className="text-sm text-muted-foreground mt-1">Total de Artigos</p>
                </div>

                <div className="card p-6 hover:border-purple-500/50 transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-500/10 rounded-xl">
                            <Eye className="h-6 w-6 text-purple-500" />
                        </div>
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                    </div>
                    <h3 className="text-3xl font-bold">{stats?.overview.total_views.toLocaleString()}</h3>
                    <p className="text-sm text-muted-foreground mt-1">Total de Visualizações</p>
                </div>

                <div className="card p-6 hover:border-emerald-500/50 transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-emerald-500/10 rounded-xl">
                            <Users className="h-6 w-6 text-emerald-500" />
                        </div>
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                    </div>
                    <h3 className="text-3xl font-bold">{stats?.overview.total_authors}</h3>
                    <p className="text-sm text-muted-foreground mt-1">Autores Ativos</p>
                </div>

                <div className="card p-6 hover:border-amber-500/50 transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-amber-500/10 rounded-xl">
                            <BarChart3 className="h-6 w-6 text-amber-500" />
                        </div>
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                    </div>
                    <h3 className="text-3xl font-bold">{stats?.overview.avg_engagement}%</h3>
                    <p className="text-sm text-muted-foreground mt-1">Engajamento Médio</p>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Views by Month */}
                <div className="card p-6">
                    <h3 className="font-bold text-lg mb-6">Visualizações por Mês</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height={300} minHeight={300}>
                            <LineChart data={stats?.views_by_month}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                                <Line type="monotone" dataKey="views" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Articles by Category */}
                <div className="card p-6">
                    <h3 className="font-bold text-lg mb-6">Artigos por Categoria</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height={300} minHeight={300}>
                            <PieChart>
                                <Pie
                                    data={stats?.articles_by_category}
                                    dataKey="count"
                                    nameKey="category"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    label
                                >
                                    {stats?.articles_by_category.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
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
                        {stats?.top_articles.map((article, idx) => (
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

                {/* Top Authors */}
                <div className="card p-6">
                    <h3 className="font-bold text-lg mb-4">Top Autores</h3>
                    <div className="space-y-3">
                        {stats?.top_authors.map((author, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                                        <span className="text-sm font-bold text-accent">{idx + 1}</span>
                                    </div>
                                    <div>
                                        <p className="font-medium">{author.name}</p>
                                        <p className="text-xs text-muted-foreground">{author.articles} artigos</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold">{author.total_views.toLocaleString()}</p>
                                    <p className="text-xs text-muted-foreground">visualizações</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
