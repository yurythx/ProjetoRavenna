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

export default function ModulesManager() {
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
                message: `Módulo ${variables.active ? 'ativado' : 'desativado'} com sucesso`
            });
        },
        onError: () => {
            show({ type: 'error', message: 'Falha ao alterar estado do módulo' });
        }
    });

    if (isLoading) return <div className="space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-40 bg-muted rounded-2xl animate-pulse" />)}
    </div>;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight">Gerenciador de Módulos</h1>
                <p className="text-muted-foreground">Controle a visibilidade e as funcionalidades do sistema Ravenna em tempo real.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {modules?.map((mod) => (
                    <div key={mod.id} className={`card p-6 border-l-4 transition-all ${mod.is_active ? 'border-l-accent' : 'border-l-gray-300 opacity-80'}`}>
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
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-accent disabled:opacity-50"></div>
                            </label>
                        </div>

                        <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                            {mod.slug === 'articles'
                                ? 'Habilita a criação, listagem e busca de artigos de tecnologia e insights no site público.'
                                : 'Módulo padrão do sistema para funcionalidades essenciais de infraestrutura.'}
                        </p>

                        <div className="mt-6 flex flex-wrap gap-3">
                            <div className="flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 bg-muted rounded-full uppercase tracking-wider">
                                <ShieldCheck className="h-3 w-3" />
                                {mod.is_system_module ? 'Vital do Sistema' : 'Expansível'}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 bg-muted rounded-full uppercase tracking-wider">
                                <Clock className="h-3 w-3" />
                                Reativo
                            </div>
                        </div>

                        {mod.is_system_module && (
                            <div className="mt-4 p-3 bg-blue-500/5 rounded-lg border border-blue-500/10 flex items-start gap-3">
                                <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                                <p className="text-[11px] text-blue-500/80 leading-snug">
                                    Módulos de sistema não podem ser desativados manualmente para preservar a integridade do banco de dados.
                                </p>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="p-6 bg-yellow-500/5 rounded-2xl border border-yellow-500/10 flex items-start gap-4">
                <AlertTriangle className="h-6 w-6 text-yellow-500 shrink-0" />
                <div>
                    <h4 className="font-bold text-yellow-500">Atenção</h4>
                    <p className="text-sm text-yellow-500/80 max-w-2xl">
                        Desativar um módulo interrompe imediatamente o acesso às suas APIs e componentes de interface relacionados.
                        Isso pode afetar a experiência do usuário se feito durante horários de pico.
                    </p>
                </div>
            </div>
        </div>
    );
}
