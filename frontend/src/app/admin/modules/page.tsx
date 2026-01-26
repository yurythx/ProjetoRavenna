'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import {
    Box,
    Power,
    Settings2,
    ShieldCheck,
    AlertTriangle,
    Info,
    Clock
} from 'lucide-react';

interface AppModule {
    id: string;
    name: string;
    slug: string;
    display_name: string;
    is_active: boolean;
    is_system_module: boolean;
    config_json: any;
}

import { useTranslations } from 'next-intl';

export default function ModulesManager() {
    const t = useTranslations('Admin');
    const { show } = useToast();
    const queryClient = useQueryClient();

    const { data: modules, isLoading } = useQuery<AppModule[]>({
        queryKey: ['admin-modules'],
        queryFn: async () => {
            const resp = await api.get('/modules/');
            return resp.data;
        }
    });

    const toggleMutation = useMutation({
        mutationFn: async ({ slug, active }: { slug: string; active: boolean }) => {
            await api.patch(`/modules/${slug}/`, { is_active: active });
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['admin-modules'] });
            // Invalidate global module context
            queryClient.invalidateQueries({ queryKey: ['modules-status'] });
            show({
                type: 'success',
                message: variables.active ? t('moduleActivated') : t('moduleDeactivated')
            });
        },
        onError: () => {
            show({ type: 'error', message: t('moduleToggleError') });
        }
    });

    if (isLoading) return <div className="space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-40 bg-muted rounded-2xl animate-pulse" />)}
    </div>;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight">{t('modulesTitle')}</h1>
                <p className="text-muted-foreground">{t('modulesSubtitle')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {modules?.map((mod) => (
                    <div key={mod.id} className={`card p-6 border-l-4 transition-all ${mod.is_active ? 'border-l-accent' : 'border-l-border opacity-80'}`}>
                        <div className="flex items-start justify-between">
                            <div className="flex gap-4">
                                <div className={`p-3 rounded-xl ${mod.is_active ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'}`}>
                                    {mod.slug === 'articles' ? <Box className="h-6 w-6" /> : <Settings2 className="h-6 w-6" />}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{mod.display_name}</h3>
                                    <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                                        slug: {mod.slug}
                                    </code>
                                </div>
                            </div>

                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={mod.is_active}
                                    disabled={mod.is_system_module || toggleMutation.isPending}
                                    onChange={(e) => toggleMutation.mutate({ slug: mod.slug, active: e.target.checked })}
                                />
                                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent disabled:opacity-50"></div>
                            </label>
                        </div>

                        <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                            {mod.slug === 'articles'
                                ? t('moduleArticlesDesc')
                                : t('moduleDefaultDesc')}
                        </p>

                        <div className="mt-6 flex flex-wrap gap-3">
                            <div className="badge badge-accent-soft inline-flex items-center gap-1">
                                <ShieldCheck className="h-3 w-3" />
                                {mod.is_system_module ? t('moduleSystem') : t('moduleExpandable')}
                            </div>
                            <div className="badge badge-accent-soft inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {t('moduleReactive')}
                            </div>
                        </div>

                        {mod.is_system_module && (
                            <div className="mt-4 p-3 bg-accent/5 rounded-lg border border-accent/10 flex items-start gap-3">
                                <Info className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                                <p className="text-[11px] text-accent/80 leading-snug">
                                    {t('moduleSystemNotice')}
                                </p>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="p-6 bg-accent/5 rounded-2xl border border-accent/10 flex items-start gap-4">
                <AlertTriangle className="h-6 w-6 text-accent shrink-0" />
                <div>
                    <h4 className="font-bold text-accent">{t('modulesNoticeTitle')}</h4>
                    <p className="text-sm text-accent/80 max-w-2xl">
                        {t('modulesNoticeDesc')}
                    </p>
                </div>
            </div>
        </div>
    );
}
