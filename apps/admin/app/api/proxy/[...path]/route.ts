import { NextRequest, NextResponse } from 'next/server';
import { API_URL, clearSession, refreshTokens, setSession } from '@/lib/server-session';

/** Same-origin proxy: adds the bearer token from the httpOnly cookie and transparently refreshes it once on 401. */
async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const url = `${API_URL}/${path.join('/')}${req.nextUrl.search}`;
  const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await req.text();

  const call = (token?: string) =>
    fetch(url, { method: req.method, body, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, cache: 'no-store' });

  let access = req.cookies.get('rc_access')?.value;
  let upstream = await call(access);
  let refreshed = null;

  if (upstream.status === 401) {
    const rt = req.cookies.get('rc_refresh')?.value;
    refreshed = rt ? await refreshTokens(rt) : null;
    if (!refreshed) {
      const res = NextResponse.json({ message: 'Session expired' }, { status: 401 });
      clearSession(res);
      return res;
    }
    access = refreshed.accessToken;
    upstream = await call(access);
  }

  const res = new NextResponse(upstream.status === 204 ? null : await upstream.text(), { status: upstream.status, headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' } });
  if (refreshed) setSession(res, refreshed);
  return res;
}

export { handle as GET, handle as POST, handle as PATCH, handle as PUT, handle as DELETE };
