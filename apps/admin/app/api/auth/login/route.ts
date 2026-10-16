import { NextRequest, NextResponse } from 'next/server';
import { API_URL, setSession } from '@/lib/server-session';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.password) return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });

  const r = await fetch(`${API_URL}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: body.email, password: body.password }) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) return NextResponse.json({ message: data.message ?? 'Login failed' }, { status: r.status });

  // Only administrators may use the dashboard. (Every admin API call is also authorised server-side.)
  if (data.user?.role !== 'ADMIN') {
    await fetch(`${API_URL}/auth/logout`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refreshToken: data.refreshToken }) });
    return NextResponse.json({ message: 'This account does not have administrator access' }, { status: 403 });
  }
  const res = NextResponse.json({ user: data.user });
  setSession(res, data);
  return res;
}
