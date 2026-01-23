'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    BookOpen,
    Settings,
    Bell,
    TrendingUp,
    ShieldCheck,
    ChevronRight,
    Palette
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { OnboardingWizard } from '@/components/OnboardingWizard';
import { useTranslations } from 'next-intl';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const t = useTranslations('Admin');
    const { user, token, isLoading: authLoading } = useAuth();

    const { data: config, isLoading: configLoading } = useQuery({
        queryKey: ['tenant-config'],
        queryFn: async () => {
            const res = await api.get('/entities/config/');
            return res.data;
        },
        enabled: !!token && !!user?.is_staff
    });

    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && (!token || !user?.is_staff)) {
            router.replace('/');
        }
    }, [user, token, authLoading, router]);

    if (authLoading || configLoading) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
    );

    if (!token || !user?.is_staff) return null;

    const navItems = [
        { label: t('overview'), icon: LayoutDashboard, href: '/admin' },
        { label: t('branding'), icon: Palette, href: '/admin/branding' },
        { label: t('stats'), icon: TrendingUp, href: '/admin/stats' },
        { label: t('modules'), icon: Settings, href: '/admin/modules' },
        { label: t('security'), icon: ShieldCheck, href: '/admin/security' },
    ];

    return (
        <div className="min-h-screen bg-muted/20 flex flex-col md:flex-row">
            {/* Sidebar */}
            <aside className="w-full md:w-64 bg-card border-b md:border-b-0 md:border-r border-border flex flex-col md:sticky md:top-16 h-auto md:h-[calc(100vh-4rem)] z-40">
                <div className="p-6 border-b border-border flex items-center gap-3">
                    <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-white font-bold">
                        R
                    </div>
                    <span className="font-bold text-lg tracking-tight">{t('title')}</span>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center justify-between p-3 rounded-xl transition-all group ${isActive
                                    ? 'bg-accent text-white shadow-lg shadow-accent/20'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <item.icon className="h-4 w-4" />
                                    <span className="text-sm font-medium">{item.label}</span>
                                </div>
                                {isActive && <ChevronRight className="h-3 w-3 opacity-50" />}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-border">
                    <Link
                        href="/"
                        className="flex items-center gap-2 p-3 text-sm text-muted-foreground hover:text-accent transition-colors"
                    >
                        ← {t('backToSite')}
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-x-hidden">
                <div className="p-6 md:p-10 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>

            {/* Onboarding Wizard */}
            {!config?.onboarding_completed && <OnboardingWizard config={config} />}
        </div>
    );
}
