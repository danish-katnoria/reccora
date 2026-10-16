import { NextRequest, NextResponse } from 'next/server';

/** Only same-site relative paths are honoured, so ?next= can never become an open redirect. */
const safeNext = (n: string | null) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/');

/**
 * Only the private areas require a session cookie here (public storefronts, products and collections stay open).
 * The API still authorises every protected call.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = req.cookies.has('rc_refresh');
  const isAuthPage = pathname === '/login' || pathname === '/register';
  if (isAuthPage && hasSession) return NextResponse.redirect(new URL(safeNext(req.nextUrl.searchParams.get('next')), req.url));
  if (!isAuthPage && !hasSession) {
    const url = new URL('/login', req.url);
    url.searchParams.set('next', pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/login', '/register', '/saved', '/profile', '/creator/:path*'] };
