import { NextRequest, NextResponse } from 'next/server';
import { API_URL, clearSession, refreshTokens, setSession } from './server-session';

/**
 * Forwards a request to the Reccora API with the session from the httpOnly cookies. A missing/expired access token is
 * refreshed once (and the rotated tokens are written back); an unrecoverable 401 clears the session.
 */
export async function forward(req: NextRequest, path: string): Promise<NextResponse> {
  const url = `${API_URL}/${path}${req.nextUrl.search}`;
  const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await req.arrayBuffer();
  const contentType = req.headers.get('content-type');

  const call = (token?: string) =>
    fetch(url, {
      method: req.method,
      body,
      headers: { ...(contentType ? { 'content-type': contentType } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
      cache: 'no-store',
    });

  let access = req.cookies.get('rc_access')?.value;
  const rt = req.cookies.get('rc_refresh')?.value;
  let refreshed = null;

  // Access cookie expired (1h) but a refresh token exists: refresh before the first call.
  if (!access && rt) {
    refreshed = await refreshTokens(rt);
    access = refreshed?.accessToken;
  }
  let upstream = await call(access);

  if (upstream.status === 401 && rt && !refreshed) {
    refreshed = await refreshTokens(rt);
    if (refreshed) upstream = await call(refreshed.accessToken);
  }
  if (upstream.status === 401 && rt && !refreshed) {
    const res = NextResponse.json({ message: 'Session expired' }, { status: 401 });
    clearSession(res);
    return res;
  }

  const res = new NextResponse(upstream.status === 204 ? null : await upstream.text(), { status: upstream.status, headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' } });
  if (refreshed) setSession(res, refreshed);
  return res;
}
