'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from '@/lib/api';

export function DynamicFavicon() {
    const { data } = useQuery({
        queryKey: ['tenant-config'],
        queryFn: async () => {
            const res = await api.get('/entities/config/');
            return res.data;
        },
        staleTime: 5 * 60 * 1000,
    });

    useEffect(() => {
        if (data?.favicon) {
            let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");

            if (!link) {
                link = document.createElement('link');
                link.rel = 'icon';
                document.getElementsByTagName('head')[0].appendChild(link);
            }

            // Avoid redundant updates
            if (link.href !== data.favicon) {
                link.href = data.favicon;
            }
        }
    }, [data?.favicon]);

    return null;
}
