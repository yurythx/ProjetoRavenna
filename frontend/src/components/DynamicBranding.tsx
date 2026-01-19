'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from '@/lib/api';

interface BrandingConfig {
    primary_color: string;
    secondary_color: string;
    primary_color_dark: string;
    secondary_color_dark: string;
    default_theme: string | null;
}

export function DynamicBranding() {
    const { data } = useQuery({
        queryKey: ['tenant-branding'],
        queryFn: async (): Promise<BrandingConfig | null> => {
            const res = await api.get('/entities/config/');
            return res.data ?? null;
        },
        staleTime: 5 * 60 * 1000,
    });

    useEffect(() => {
        if (!data) return;

        // Apply colors to CSS variables
        document.documentElement.style.setProperty('--brand-primary', data.primary_color);
        document.documentElement.style.setProperty('--brand-secondary', data.secondary_color);
        document.documentElement.style.setProperty('--brand-primary-dark', data.primary_color_dark);
        document.documentElement.style.setProperty('--brand-secondary-dark', data.secondary_color_dark);
    }, [data]);

    return null; // This component doesn't render anything
}
