import { NextResponse } from 'next/server';

export const API_URL = process.env.API_URL ?? 'http://localhost:3000/api/v1';
const secure = process.env.NODE_ENV === 'production';

export interface Tokens { accessToken: string; refreshToken: string }

export function setSession(res: NextResponse, t: Tokens) {
  const base = { httpOnly: true, secure, sameSite: 'strict' as const, path: '/' };
  res.cookies.set('rc_access', t.accessToken, { ...base, maxAge: 60 * 60 });
  res.cookies.set('rc_refresh', t.refreshToken, { ...base, maxAge: 60 * 60 * 24 * 30 });
}

export function clearSession(res: NextResponse) {
  res.cookies.delete('rc_access');
  res.cookies.delete('rc_refresh');
}

export async function refreshTokens(refreshToken: string): Promise<Tokens | null> {
  const r = await fetch(`${API_URL}/auth/refresh`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refreshToken }) });
  if (!r.ok) return null;
  return (await r.json()) as Tokens;
}
