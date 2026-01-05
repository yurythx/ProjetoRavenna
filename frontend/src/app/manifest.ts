import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Projeto Ravenna',
    short_name: 'Ravenna',
    start_url: '/',
    display: 'standalone',
    theme_color: '#0ea5e9',
    background_color: '#ffffff',
    lang: 'pt-BR',
  };
}

