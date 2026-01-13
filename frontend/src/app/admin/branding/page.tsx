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
    primary_color_dark: string;
    secondary_color_dark: string;
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
        primary_color_dark: '#44B78B',
        secondary_color_dark: '#0C4B33',
        logo: null,
        favicon: null,
        footer_text: '',
    });

    const colorPresets = [
        { name: 'Ravenna (Padrão)', primary: '#44B78B', secondary: '#2D3748', primaryDark: '#44B78B', secondaryDark: '#0C4B33' },
        { name: 'Azul Oceano', primary: '#0ea5e9', secondary: '#0c4a6e', primaryDark: '#38bdf8', secondaryDark: '#082f49' },
        { name: 'Roxo Elegante', primary: '#8b5cf6', secondary: '#4c1d95', primaryDark: '#a78bfa', secondaryDark: '#2e1065' },
        { name: 'Laranja Vibrante', primary: '#f97316', secondary: '#7c2d12', primaryDark: '#fb923c', secondaryDark: '#431407' },
        { name: 'Verde Floresta', primary: '#10b981', secondary: '#064e3b', primaryDark: '#34d399', secondaryDark: '#022c22' },
    ];

    const applyPreset = (preset: typeof colorPresets[0]) => {
        setFormData({
            ...formData,
            primary_color: preset.primary,
            secondary_color: preset.secondary,
            primary_color_dark: preset.primaryDark,
            secondary_color_dark: preset.secondaryDark,
        });
        show({ type: 'success', message: `Tema "${preset.name}" aplicado!` });
    };

    const exportConfig = () => {
        const config = {
            brand_name: formData.brand_name,
            primary_color: formData.primary_color,
            secondary_color: formData.secondary_color,
            footer_text: formData.footer_text,
            exported_at: new Date().toISOString(),
        };

        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `branding-${formData.brand_name || 'config'}-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        show({ type: 'success', message: 'Configuração exportada!' });
    };

    const importConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target?.result as string);
                setFormData({
                    ...formData,
                    brand_name: imported.brand_name || formData.brand_name,
                    primary_color: imported.primary_color || formData.primary_color,
                    secondary_color: imported.secondary_color || formData.secondary_color,
                    footer_text: imported.footer_text || formData.footer_text,
                });
                show({ type: 'success', message: 'Configuração importada com sucesso!' });
            } catch (error) {
                show({ type: 'error', message: 'Erro ao importar arquivo. Verifique o formato.' });
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset input
    };

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
        data.append('primary_color_dark', formData.primary_color_dark);
        data.append('secondary_color_dark', formData.secondary_color_dark);
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight">Identidade Visual</h1>
                    <p className="text-muted-foreground">Configure logo, cores e nome de marca do sistema.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={exportConfig}
                        className="btn btn-outline btn-sm flex items-center gap-2"
                    >
                        <Upload className="h-4 w-4 rotate-180" />
                        Exportar
                    </button>
                    <label className="btn btn-outline btn-sm flex items-center gap-2 cursor-pointer">
                        <Upload className="h-4 w-4" />
                        Importar
                        <input
                            type="file"
                            accept=".json"
                            onChange={importConfig}
                            className="hidden"
                        />
                    </label>
                </div>
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

                        {/* Color Presets */}
                        <div>
                            <label className="block text-sm font-semibold mb-3">Paletas de Cores Predefinidas</label>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                                {colorPresets.map((preset, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => applyPreset(preset)}
                                        className="group relative p-2 rounded-lg border border-border hover:border-accent transition-all bg-card hover:shadow-md"
                                        title={preset.name}
                                    >
                                        <div className="flex gap-1 mb-1">
                                            <div
                                                className="h-8 flex-1 rounded"
                                                style={{ backgroundColor: preset.primary }}
                                            />
                                            <div
                                                className="h-8 flex-1 rounded"
                                                style={{ backgroundColor: preset.secondary }}
                                            />
                                        </div>
                                        <p className="text-[10px] font-medium text-center truncate group-hover:text-accent">
                                            {preset.name}
                                        </p>
                                    </button>
                                ))}
                            </div>
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

                        {/* Dark Mode Colors */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold mb-2">Cor Primária (Dark Mode)</label>
                                <div className="flex gap-3 items-center">
                                    <input
                                        type="color"
                                        value={formData.primary_color_dark}
                                        onChange={(e) => setFormData({ ...formData, primary_color_dark: e.target.value })}
                                        className="h-12 w-20 rounded-lg cursor-pointer border border-border"
                                    />
                                    <input
                                        type="text"
                                        value={formData.primary_color_dark}
                                        onChange={(e) => setFormData({ ...formData, primary_color_dark: e.target.value })}
                                        className="flex-1 px-4 py-2 rounded-lg border border-border bg-background font-mono text-sm"
                                        placeholder="#44B78B"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-2">Cor Secundária (Dark Mode)</label>
                                <div className="flex gap-3 items-center">
                                    <input
                                        type="color"
                                        value={formData.secondary_color_dark}
                                        onChange={(e) => setFormData({ ...formData, secondary_color_dark: e.target.value })}
                                        className="h-12 w-20 rounded-lg cursor-pointer border border-border"
                                    />
                                    <input
                                        type="text"
                                        value={formData.secondary_color_dark}
                                        onChange={(e) => setFormData({ ...formData, secondary_color_dark: e.target.value })}
                                        className="flex-1 px-4 py-2 rounded-lg border border-border bg-background font-mono text-sm"
                                        placeholder="#0C4B33"
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

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    // Apply preview by injecting CSS variables temporarily
                                    document.body.style.setProperty('--brand-primary', formData.primary_color);
                                    document.body.style.setProperty('--brand-secondary', formData.secondary_color);
                                    show({ type: 'info', message: 'Preview aplicado! Recarregue para reverter.' });
                                }}
                                className="btn btn-outline flex-1 flex items-center justify-center gap-2"
                            >
                                <Eye className="h-4 w-4" />
                                Aplicar Preview
                            </button>
                            <button
                                type="submit"
                                disabled={updateMutation.isPending}
                                className="btn btn-primary flex-1 flex items-center justify-center gap-2"
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
                        </div>
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
