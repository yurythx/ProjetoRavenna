'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { hexToHSL } from '@/lib/colors';
import { useTheme } from 'next-themes';

interface BrandingConfig {
    primary_color: string;
    secondary_color: string;
    primary_color_dark: string;
    secondary_color_dark: string;
}

export function DynamicBranding() {
    const { user } = useAuth();
    const { theme, resolvedTheme } = useTheme();
    const currentTheme = resolvedTheme || theme;

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

        // Priority logic: User colors > Company colors
        const isDark = currentTheme === 'dark';

        const rawPrimary = isDark
            ? (user?.primary_color_dark || data.primary_color_dark || user?.primary_color || data.primary_color)
            : (user?.primary_color || data.primary_color);

        const rawSecondary = isDark
            ? (user?.secondary_color_dark || data.secondary_color_dark || user?.secondary_color || data.secondary_color)
            : (user?.secondary_color || data.secondary_color);

        // Convert to HSL for fluidity
        const p = hexToHSL(rawPrimary);
        const s = hexToHSL(rawSecondary);

        // Apply HSL components to CSS variables
        const root = document.documentElement;

        root.style.setProperty('--brand-primary-h', p.h.toString());
        root.style.setProperty('--brand-primary-s', `${p.s}%`);
        root.style.setProperty('--brand-primary-l', `${p.l}%`);

        root.style.setProperty('--brand-secondary-h', s.h.toString());
        root.style.setProperty('--brand-secondary-s', `${s.s}%`);
        root.style.setProperty('--brand-secondary-l', `${s.l}%`);

        // Legacy hex variables for compatibility
        root.style.setProperty('--brand-primary', rawPrimary);
        root.style.setProperty('--brand-secondary', rawSecondary);

        // Also add a 'raw' version for tailwind/hsl if needed
        root.style.setProperty('--brand-primary-hsl', `${p.h} ${p.s}% ${p.l}%`);
        root.style.setProperty('--brand-secondary-hsl', `${s.h} ${s.s}% ${s.l}%`);

    }, [data, user, currentTheme]);

    return null;
}
