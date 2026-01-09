import { NextRequest } from 'next/server';

const ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1', 'api.projetoravenna.cloud', 'projetoravenna.cloud', 'minio.projetoravenna.cloud']);
const ALLOWED_PORTS = new Set(['8000', '8001', '9002']);

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams.get('url');
    if (!url) {
      return new Response(JSON.stringify({ detail: 'Missing url param' }), { status: 400, headers: { 'content-type': 'application/json' } });
    }
    const target = new URL(url);
    if (!ALLOWED_HOSTS.has(target.hostname) || (target.port && !ALLOWED_PORTS.has(target.port))) {
      return new Response(JSON.stringify({ detail: 'Host not allowed' }), { status: 403, headers: { 'content-type': 'application/json' } });
    }

    // Docker environment fix: rewrite localhost:9002 to minio:9002 and ensure HTTP
    if (process.env.IS_DOCKER === 'true' && (target.hostname === 'localhost' || target.hostname === '127.0.0.1') && target.port === '9002') {
      target.hostname = 'minio';
      target.protocol = 'http:';
    }

    // Add minio to allowed hosts check if rewritten
    const effectiveHostname = target.hostname;
    const effectivePort = target.port;
    
    if (!ALLOWED_HOSTS.has(effectiveHostname) && effectiveHostname !== 'minio') {
         if (!ALLOWED_HOSTS.has(target.hostname) || (target.port && !ALLOWED_PORTS.has(target.port))) {
            return new Response(JSON.stringify({ detail: 'Host not allowed' }), { status: 403, headers: { 'content-type': 'application/json' } });
         }
    }

    const res = await fetch(target.toString(), { headers: { accept: 'image/*' } });
    if (!res.ok) {
      return new Response(JSON.stringify({ detail: 'Upstream error', status: res.status }), { status: 502, headers: { 'content-type': 'application/json' } });
    }
    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const buffer = await res.arrayBuffer();
    return new Response(buffer, {
      status: 200,
      headers: {
        'content-type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=43200'
      }
    });
  } catch (e) {
    console.error('Proxy error details:', e);
    return new Response(JSON.stringify({ detail: 'Proxy error', error: String(e) }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}

