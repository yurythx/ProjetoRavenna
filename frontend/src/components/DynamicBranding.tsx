'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

interface BrandingConfig {
    primary_color: string;
    secondary_color: string;
    primary_color_dark: string;
    secondary_color_dark: string;
}

export function DynamicBranding() {
    const { data } = useQuery({
        queryKey: ['tenant-branding'],
        queryFn: async (): Promise<BrandingConfig | null> => {
            const res = await fetch('/api/v1/entities/config/', {
                headers: { 'Content-Type': 'application/json' },
                cache: 'no-store', // Always fetch fresh data
            });
            if (!res.ok) return null;
            return res.json();
        },
        refetchInterval: 5000, // Refetch every 5 seconds
        staleTime: 0, // Always consider data stale
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
