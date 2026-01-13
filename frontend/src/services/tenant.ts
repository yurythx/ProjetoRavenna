

export interface TenantConfig {
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
    social_links: Record<string, string>;
}

const API_URL = process.env.INTERNAL_API_URL || 'http://localhost:8000/api/v1';

export async function getTenantConfig(): Promise<TenantConfig | null> {
    const { headers } = await import('next/headers');
    const headersList = await headers();
    const host = headersList.get('host') || 'localhost';

    try {
        const res = await fetch(`${API_URL}/entities/config/`, {
            method: 'GET',
            headers: {
                'Host': host,
                'Content-Type': 'application/json',
            },
            cache: 'no-store', // Always fetch fresh data for SSR
        });

        if (!res.ok) {
            console.warn(`[Tenant] Failed to fetch config for host ${host}: ${res.status}`);
            return null;
        }

        return res.json();
    } catch (error) {
        console.error(`[Tenant] Error fetching config for host ${host}:`, error);
        return null;
    }
}
