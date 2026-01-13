'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import {
    Palette,
    Upload,
    CheckCircle,
    AlertCircle,
    Loader2,
    Eye
} from 'lucide-react';

interface EntityBranding {
    name: string;
    brand_name: string | null;
    domain: string | null;
    primary_color: string;
    secondary_color: string;
    logo: string | null;
    favicon: string | null;
    footer_text: string;
}

export default function BrandingManager() {
    const { show } = useToast();
    const queryClient = useQueryClient();

    const { data: entity, isLoading } = useQuery<EntityBranding>({
        queryKey: ['entity-config'],
        queryFn: async () => {
            const resp = await api.get('/entities/config/');
            return resp.data;
        }
    });

    const [formData, setFormData] = useState<EntityBranding>({
        name: '',
        brand_name: '',
        domain: '',
        primary_color: '#44B78B',
        secondary_color: '#2D3748',
        logo: null,
        favicon: null,
        footer_text: '',
    });

    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [faviconFile, setFaviconFile] = useState<File | null>(null);

    useEffect(() => {
        if (entity) {
            setFormData(entity);
        }
    }, [entity]);

    const updateMutation = useMutation({
        mutationFn: async (data: FormData) => {
            const resp = await api.patch(`/entities/config/`, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return resp.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['entity-config'] });
            show({ type: 'success', message: 'Branding atualizado com sucesso! Recarregue a página para ver as mudanças.' });
        },
        onError: (error: any) => {
            show({ type: 'error', message: error.response?.data?.detail || 'Erro ao atualizar branding' });
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const data = new FormData();

        data.append('brand_name', formData.brand_name || '');
        data.append('primary_color', formData.primary_color);
        data.append('secondary_color', formData.secondary_color);
        data.append('footer_text', formData.footer_text);

        if (logoFile) data.append('logo', logoFile);
        if (faviconFile) data.append('favicon', faviconFile);

        updateMutation.mutate(data);
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="h-12 bg-muted rounded-lg animate-pulse" />
                <div className="h-96 bg-muted rounded-2xl animate-pulse" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight">Identidade Visual</h1>
                <p className="text-muted-foreground">Configure logo, cores e nome de marca do sistema.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form Section */}
                <div className="lg:col-span-2 card p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Brand Name */}
                        <div>
                            <label className="block text-sm font-semibold mb-2">Nome da Marca</label>
                            <input
                                type="text"
                                value={formData.brand_name || ''}
                                onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-accent outline-none"
                                placeholder="Projeto Ravenna"
                            />
                            <p className="text-xs text-muted-foreground mt-1">Aparece no cabeçalho e título da aba do navegador</p>
                        </div>

                        {/* Colors */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold mb-2">Cor Primária</label>
                                <div className="flex gap-3 items-center">
                                    <input
                                        type="color"
                                        value={formData.primary_color}
                                        onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                                        className="h-12 w-20 rounded-lg cursor-pointer border border-border"
                                    />
                                    <input
                                        type="text"
                                        value={formData.primary_color}
                                        onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                                        className="flex-1 px-4 py-2 rounded-lg border border-border bg-background font-mono text-sm"
                                        placeholder="#44B78B"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-2">Cor Secundária</label>
                                <div className="flex gap-3 items-center">
                                    <input
                                        type="color"
                                        value={formData.secondary_color}
                                        onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                                        className="h-12 w-20 rounded-lg cursor-pointer border border-border"
                                    />
                                    <input
                                        type="text"
                                        value={formData.secondary_color}
                                        onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                                        className="flex-1 px-4 py-2 rounded-lg border border-border bg-background font-mono text-sm"
                                        placeholder="#2D3748"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer Text */}
                        <div>
                            <label className="block text-sm font-semibold mb-2">Texto do Rodapé</label>
                            <textarea
                                value={formData.footer_text}
                                onChange={(e) => setFormData({ ...formData, footer_text: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-accent outline-none resize-none"
                                rows={3}
                                placeholder="Todos os direitos reservados."
                            />
                        </div>

                        {/* Logo Upload */}
                        <div>
                            <label className="block text-sm font-semibold mb-2">Logo</label>
                            <div className="flex flex-col gap-2">
                                {formData.logo && !logoFile && (
                                    <img src={formData.logo} alt="Logo atual" className="h-12 object-contain bg-muted p-2 rounded" />
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                                    className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-white hover:file:bg-accent/90 cursor-pointer"
                                />
                            </div>
                        </div>

                        {/* Favicon Upload */}
                        <div>
                            <label className="block text-sm font-semibold mb-2">Favicon</label>
                            <div className="flex flex-col gap-2">
                                {formData.favicon && !faviconFile && (
                                    <img src={formData.favicon} alt="Favicon atual" className="h-8 w-8 object-contain bg-muted p-1 rounded" />
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setFaviconFile(e.target.files?.[0] || null)}
                                    className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-white hover:file:bg-accent/90 cursor-pointer"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={updateMutation.isPending}
                            className="btn btn-primary w-full flex items-center justify-center gap-2"
                        >
                            {updateMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="h-4 w-4" />
                                    Salvar Alterações
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Preview Section */}
                <div className="card p-6 space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                        <Eye className="h-5 w-5 text-accent" />
                        <h3 className="font-bold">Preview</h3>
                    </div>

                    <div className="space-y-4">
                        {/* Color Preview */}
                        <div>
                            <p className="text-xs font-medium mb-2 text-muted-foreground">Cores</p>
                            <div className="flex gap-2">
                                <div
                                    className="h-16 flex-1 rounded-lg border border-border flex items-center justify-center text-white text-xs font-bold"
                                    style={{ backgroundColor: formData.primary_color }}
                                >
                                    Primária
                                </div>
                                <div
                                    className="h-16 flex-1 rounded-lg border border-border flex items-center justify-center text-white text-xs font-bold"
                                    style={{ backgroundColor: formData.secondary_color }}
                                >
                                    Secundária
                                </div>
                            </div>
                        </div>

                        {/* Button Preview */}
                        <div>
                            <p className="text-xs font-medium mb-2 text-muted-foreground">Botões</p>
                            <button
                                className="px-4 py-2 rounded-lg text-white font-medium w-full"
                                style={{ backgroundColor: formData.primary_color }}
                            >
                                Botão Primário
                            </button>
                        </div>

                        {/* Info Box */}
                        <div className="p-4 bg-blue-500/5 rounded-lg border border-blue-500/10">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-blue-500/80">
                                    As mudanças serão aplicadas imediatamente após salvar. Pode ser necessário recarregar a página.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
