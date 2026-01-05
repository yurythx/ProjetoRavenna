import { NextRequest } from 'next/server';

const ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1']);
const ALLOWED_PORTS = new Set(['8000', '8001']);

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
    const res = await fetch(target.toString(), { headers: { accept: 'image/*' } });
    if (!res.ok) {
      return new Response(JSON.stringify({ detail: 'Upstream error', status: res.status }), { status: 502, headers: { 'content-type': 'application/json' } });
    }
    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const buffer = await res.arrayBuffer();
    return new Response(buffer, { status: 200, headers: { 'content-type': contentType } });
  } catch (e) {
    return new Response(JSON.stringify({ detail: 'Proxy error' }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}

