import { NextRequest, NextResponse } from 'next/server';
import { API_URL, setSession } from '@/lib/server-session';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ message: 'Invalid request' }, { status: 400 });

  const r = await fetch(`${API_URL}/auth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) return NextResponse.json({ message: Array.isArray(data.message) ? data.message[0] : data.message ?? 'Registration failed' }, { status: r.status });

  const res = NextResponse.json({ user: data.user, emailVerificationRequired: !!data.emailVerificationRequired });
  if (data.accessToken && data.refreshToken) setSession(res, data);
  return res;
}
