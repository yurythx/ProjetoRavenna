'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { ColorPickerGroup } from '@/components/ColorPickerGroup';
import {
    Palette,
    Upload,
    CheckCircle,
    AlertCircle,
    Loader2,
    Eye,
    RotateCcw
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

import { useTranslations } from 'next-intl';

export default function BrandingManager() {
    const t = useTranslations('Admin');
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
        { name: `Ravenna (${t('statusActive')})`, primary: '#44B78B', secondary: '#2D3748', primaryDark: '#44B78B', secondaryDark: '#0C4B33' },
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

        show({ type: 'success', message: t('exportSuccess') });
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
                show({ type: 'success', message: t('importSuccess') });
            } catch (error) {
                show({ type: 'error', message: t('importError') });
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
            queryClient.invalidateQueries({ queryKey: ['tenant-branding'] });
            show({ type: 'success', message: t('updateSuccess') });
        },
        onError: (error: any) => {
            show({ type: 'error', message: error.response?.data?.detail || t('updateError') });
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
                    <h1 className="text-3xl font-extrabold tracking-tight">{t('branding')}</h1>
                    <p className="text-muted-foreground">{t('brandingSubtitle')}</p>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={exportConfig}
                        className="btn btn-outline btn-sm flex items-center gap-2"
                    >
                        <Upload className="h-4 w-4 rotate-180" />
                        {t('export')}
                    </button>
                    <label className="btn btn-outline btn-sm flex items-center gap-2 cursor-pointer">
                        <Upload className="h-4 w-4" />
                        {t('import')}
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
                            <label className="block text-sm font-semibold mb-2">{t('brandName')}</label>
                            <input
                                type="text"
                                value={formData.brand_name || ''}
                                onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-accent outline-none"
                                placeholder={t('brandNamePlaceholder')}
                            />
                            <p className="text-xs text-muted-foreground mt-1">{t('brandNameDesc')}</p>
                        </div>

                        {/* Color Presets */}
                        <div>
                            <label className="block text-sm font-semibold mb-3">{t('colorPresets')}</label>
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
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <ColorPickerGroup
                                    label={t('primaryColor')}
                                    value={formData.primary_color}
                                    onChange={(value) => setFormData({ ...formData, primary_color: value })}
                                    defaultValue="#44B78B"
                                    placeholder="#44B78B"
                                />
                                <ColorPickerGroup
                                    label={t('secondaryColor')}
                                    value={formData.secondary_color}
                                    onChange={(value) => setFormData({ ...formData, secondary_color: value })}
                                    defaultValue="#2D3748"
                                    placeholder="#2D3748"
                                />
                            </div>

                            {/* Dark Mode Colors */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <ColorPickerGroup
                                    label={t('primaryColorDark')}
                                    value={formData.primary_color_dark}
                                    onChange={(value) => setFormData({ ...formData, primary_color_dark: value })}
                                    defaultValue="#44B78B"
                                    placeholder="#44B78B"
                                />
                                <ColorPickerGroup
                                    label={t('secondaryColorDark')}
                                    value={formData.secondary_color_dark}
                                    onChange={(value) => setFormData({ ...formData, secondary_color_dark: value })}
                                    defaultValue="#0C4B33"
                                    placeholder="#0C4B33"
                                />
                            </div>
                        </div>

                        {/* Footer Text */}
                        <div>
                            <label className="block text-sm font-semibold mb-2">{t('footerText')}</label>
                            <textarea
                                value={formData.footer_text}
                                onChange={(e) => setFormData({ ...formData, footer_text: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-accent outline-none resize-none"
                                rows={3}
                                placeholder={t('footerPlaceholder')}
                            />
                        </div>

                        {/* Logo Upload */}
                        <div>
                            <label className="block text-sm font-semibold mb-2">{t('logo')}</label>
                            <div className="flex flex-col gap-2">
                                {formData.logo && !logoFile && (
                                    <img src={formData.logo} alt="Logo" className="h-12 object-contain bg-muted p-2 rounded" />
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
                            <label className="block text-sm font-semibold mb-2">{t('favicon')}</label>
                            <div className="flex flex-col gap-2">
                                {formData.favicon && !faviconFile && (
                                    <img src={formData.favicon} alt="Favicon" className="h-8 w-8 object-contain bg-muted p-1 rounded" />
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
                                    if (confirm(t('resetBrandColorsConfirm'))) {
                                        setFormData({
                                            ...formData,
                                            primary_color: '#44B78B',
                                            secondary_color: '#2D3748',
                                            primary_color_dark: '#44B78B',
                                            secondary_color_dark: '#0C4B33'
                                        });
                                        show({ type: 'success', message: t('colorsResetSuccess') });
                                    }
                                }}
                                className="btn btn-outline flex-1 flex items-center justify-center gap-2"
                            >
                                <RotateCcw className="h-4 w-4" />
                                {t('resetBrandColors')}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    document.documentElement.style.setProperty('--brand-primary', formData.primary_color);
                                    document.documentElement.style.setProperty('--brand-secondary', formData.secondary_color);
                                    document.documentElement.style.setProperty('--brand-primary-dark', formData.primary_color_dark);
                                    document.documentElement.style.setProperty('--brand-secondary-dark', formData.secondary_color_dark);
                                    show({ type: 'info', message: t('previewApplied') });
                                }}
                                className="btn btn-outline flex-1 flex items-center justify-center gap-2"
                            >
                                <Eye className="h-4 w-4" />
                                {t('applyPreview')}
                            </button>
                            <button
                                type="submit"
                                disabled={updateMutation.isPending}
                                className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                            >
                                {updateMutation.isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        {t('saving')}
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="h-4 w-4" />
                                        {t('saveChanges')}
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
                        <h3 className="font-bold">{t('preview')}</h3>
                    </div>

                    <div className="space-y-4">
                        {/* Color Preview */}
                        <div>
                            <p className="text-xs font-medium mb-2 text-muted-foreground">{t('previewColors')}</p>
                            <div className="flex gap-2">
                                <div
                                    className="h-16 flex-1 rounded-lg border border-border flex items-center justify-center text-white text-xs font-bold"
                                    style={{ backgroundColor: formData.primary_color }}
                                >
                                    {t('previewPrimary')}
                                </div>
                                <div
                                    className="h-16 flex-1 rounded-lg border border-border flex items-center justify-center text-white text-xs font-bold"
                                    style={{ backgroundColor: formData.secondary_color }}
                                >
                                    {t('previewSecondary')}
                                </div>
                            </div>
                        </div>

                        {/* Button Preview */}
                        <div>
                            <p className="text-xs font-medium mb-2 text-muted-foreground">{t('previewButtons')}</p>
                            <button
                                className="px-4 py-2 rounded-lg text-white font-medium w-full"
                                style={{ backgroundColor: formData.primary_color }}
                            >
                                {t('previewPrimaryBtn')}
                            </button>
                        </div>

                {/* Info Box */}
                <div className="p-4 bg-accent/5 rounded-lg border border-accent/10">
                            <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                    <p className="text-xs text-accent/80">
                                    {t('previewNotice')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
