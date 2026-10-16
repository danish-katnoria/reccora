import { NextRequest, NextResponse } from 'next/server';
import { forward } from '@/lib/server-proxy';

/** Session probe: always 200, `{ user: null }` when signed out (so anonymous page loads don't log 401s). */
export async function GET(req: NextRequest) {
  if (!req.cookies.has('rc_refresh') && !req.cookies.has('rc_access')) return NextResponse.json({ user: null });
  const res = await forward(req, 'users/me');
  if (res.status === 401) {
    const out = NextResponse.json({ user: null });
    res.cookies.getAll().forEach((c) => out.cookies.set(c));
    return out;
  }
  if (!res.ok) return res;
  const user = await res.json();
  const out = NextResponse.json({ user });
  res.cookies.getAll().forEach((c) => out.cookies.set(c));
  return out;
}
