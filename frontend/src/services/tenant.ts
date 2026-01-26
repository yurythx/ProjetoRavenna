import { api } from '@/lib/api';

export type TenantConfig = {
  name: string;
  brand_name?: string;
  footer_text?: string;
  default_language?: string;
  default_theme?: string;
  primaryColor: string;
  secondaryColor: string;
  primary_color?: string;
  secondary_color?: string;
  primary_color_dark?: string;
  secondary_color_dark?: string;
  faviconUrl?: string;
  favicon?: string;
  logo?: string;
};

export async function getTenantConfig(): Promise<TenantConfig> {
  try {
    const { data } = await api.get('/entities/config/');
    return {
      name: data?.name ?? 'Projeto Ravenna',
      brand_name: data?.brand_name ?? data?.name,
      footer_text: data?.footer_text ?? '',
      default_language: data?.default_language ?? 'pt_BR',
      default_theme: data?.default_theme ?? '',
      primaryColor: data?.primary_color ?? '#4f46e5',
      secondaryColor: data?.secondary_color ?? '#22c55e',
      primary_color: data?.primary_color ?? undefined,
      secondary_color: data?.secondary_color ?? undefined,
      primary_color_dark: data?.primary_color_dark ?? undefined,
      secondary_color_dark: data?.secondary_color_dark ?? undefined,
      faviconUrl: data?.favicon_url ?? undefined,
      favicon: data?.favicon_url ?? undefined,
      logo: data?.logo_url ?? undefined,
    };
  } catch {
    return {
      name: 'Projeto Ravenna',
      primaryColor: '#4f46e5',
      secondaryColor: '#22c55e',
    };
  }
}
