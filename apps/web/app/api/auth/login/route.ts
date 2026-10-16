import { NextRequest, NextResponse } from 'next/server';
import { API_URL, setSession } from '@/lib/server-session';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.password) return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });

  const r = await fetch(`${API_URL}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': req.headers.get('user-agent') ?? '' }, body: JSON.stringify({ email: body.email, password: body.password }), cache: 'no-store' });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) return NextResponse.json({ message: Array.isArray(data.message) ? data.message[0] : data.message ?? 'Login failed' }, { status: r.status });

  const res = NextResponse.json({ user: data.user });
  setSession(res, data);
  return res;
}
