import type { NextRequest } from 'next/server';

/**
 * @metagptx/web-sdk при stream: true дергает fetch('/api/v1/aihub/gentxt') с origin страницы (Next),
 * а не NEXT_PUBLIC_API_BASE_URL — без этого роута браузер получает 404 от Next.
 * Проксируем на реальный FastAPI (systemd/Docker: задать INTERNAL_API_BASE_URL).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function backendBase(): string {
  return (process.env.INTERNAL_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
}

async function proxy(req: NextRequest, pathParts: string[]) {
  const sub = pathParts.length ? pathParts.join('/') : '';
  if (!sub) {
    return new Response('Not Found', { status: 404 });
  }

  const target = `${backendBase()}/api/v1/aihub/${sub}${req.nextUrl.search}`;
  const headers = new Headers(req.headers);
  headers.delete('host');
  headers.delete('connection');

  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: 'manual',
  };

  if (!['GET', 'HEAD'].includes(req.method)) {
    init.body = req.body;
    Object.assign(init, { duplex: 'half' } as RequestInit);
  }

  const res = await fetch(target, init);
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  });
}

type RouteCtx = { params: Promise<{ path?: string[] }> };

async function handle(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(req, path ?? []);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
