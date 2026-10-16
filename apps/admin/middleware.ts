import { NextRequest, NextResponse } from 'next/server';

/** Redirect unauthenticated visitors to /login. Real authorisation is enforced by the API on every call. */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = req.cookies.has('rc_refresh');
  if (pathname === '/login') return hasSession ? NextResponse.redirect(new URL('/', req.url)) : NextResponse.next();
  if (!hasSession) return NextResponse.redirect(new URL('/login', req.url));
  return NextResponse.next();
}

export const config = { matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'] };
