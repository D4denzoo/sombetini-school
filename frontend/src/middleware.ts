import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const access = request.cookies.get('sp_at')?.value;
  const refresh = request.cookies.get('sp_rt')?.value;
  if (!access && !refresh) {
    const login = new URL('/login?expired=1', request.url);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/portal/:path*'],
};
