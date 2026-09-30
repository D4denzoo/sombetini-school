import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function unavailable() {
  return NextResponse.json(
    {
      success: false,
      statusCode: 503,
      message: 'The school site is briefly unavailable. Wait a moment and try again. If it continues, contact the school office.',
    },
    { status: 503 },
  );
}

async function proxy(req: NextRequest, path: string[]) {
  const url = `${BACKEND}/api/v1/${path.map(encodeURIComponent).join('/')}${req.nextUrl.search}`;
  const headers = new Headers();
  for (const name of ['authorization', 'content-type', 'x-csrf-token', 'x-request-id', 'cookie', 'accept', 'origin', 'referer']) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }

  const method = req.method.toUpperCase();
  const body = method === 'GET' || method === 'HEAD' ? undefined : await req.arrayBuffer();

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method,
      headers,
      body,
      redirect: 'manual',
    });
  } catch (error) {
    console.error('API proxy failed', url, error);
    return unavailable();
  }

  const out = new Headers();
  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (['content-encoding', 'transfer-encoding', 'connection', 'set-cookie'].includes(lower)) return;
    out.append(key, value);
  });

  const response = new NextResponse(upstream.body, { status: upstream.status, headers: out });
  const cookies = typeof upstream.headers.getSetCookie === 'function' ? upstream.headers.getSetCookie() : [];
  for (const cookie of cookies) response.headers.append('set-cookie', cookie);
  return response;
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path || []);
}
export async function POST(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path || []);
}
export async function PUT(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path || []);
}
export async function PATCH(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path || []);
}
export async function DELETE(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path || []);
}
