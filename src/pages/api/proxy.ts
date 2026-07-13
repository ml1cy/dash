import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST,OPTIONS',
  'access-control-allow-headers': 'content-type,authorization',
};

const resolveAllowList = (env?: Record<string, unknown>): string[] => {
  const value = env?.ALLOWED_PROXY_HOSTS;
  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  return value
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
};

const proxyHandler: APIRoute = async ({ request }) => {
  let payload: Record<string, unknown> = {};

  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    });
  }

  const url = typeof payload.url === 'string' ? payload.url : '';
  const method = typeof payload.method === 'string' ? payload.method.toUpperCase() : 'GET';
  const body = payload.body;
  if (!url) {
    return new Response(JSON.stringify({ error: 'Missing target URL.' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid target URL.' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    });
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return new Response(JSON.stringify({ error: 'Unsupported protocol.' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    });
  }

  const allowedHosts = resolveAllowList(env as Record<string, unknown>);
  if (allowedHosts.length === 0) {
    return new Response(JSON.stringify({ error: 'Proxy allowlist is not configured.' }), {
      status: 403,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    });
  }

  if (!allowedHosts.includes(parsedUrl.hostname.toLowerCase())) {
    return new Response(JSON.stringify({ error: 'Host not allowed.' }), {
      status: 403,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
    });
  }

  const bodyAllowed = method !== 'GET' && method !== 'HEAD';

  const response = await fetch(parsedUrl.toString(), {
    method,
    headers: bodyAllowed && body ? { 'content-type': 'application/json' } : undefined,
    body: bodyAllowed && body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  return new Response(text, {
    status: response.status,
    headers: {
      ...CORS_HEADERS,
      'content-type': response.headers.get('content-type') ?? 'text/plain',
    },
  });
};

export const OPTIONS: APIRoute = async () => new Response(null, { status: 204, headers: CORS_HEADERS });
export const POST = proxyHandler;
