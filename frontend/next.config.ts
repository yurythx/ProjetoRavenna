import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '8000' },
      { protocol: 'http', hostname: '127.0.0.1', port: '8000' },
      { protocol: 'https', hostname: 'api.projetoravenna.cloud' },
    ],
    localPatterns: [
      { pathname: '/api/img' },
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async redirects() {
    return [
      { source: '/login', destination: '/auth/login', permanent: false },
      { source: '/blog', destination: '/artigos', permanent: false },
      { source: '/blog/new', destination: '/artigos/new', permanent: false },
      { source: '/blog/editor', destination: '/artigos/editor', permanent: false },
      { source: '/blog/:slug', destination: '/artigos/:slug', permanent: false },
      { source: '/blog/:slug/edit', destination: '/artigos/:slug/edit', permanent: false },
    ];
  },
  output: 'standalone',
};

export default nextConfig;
