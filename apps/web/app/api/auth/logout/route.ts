import { NextRequest, NextResponse } from 'next/server';
import { API_URL, clearSession } from '@/lib/server-session';

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get('rc_refresh')?.value;
  if (refreshToken) {
    await fetch(`${API_URL}/auth/logout`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refreshToken }) }).catch(() => undefined);
  }
  const res = NextResponse.json({ success: true });
  clearSession(res);
  return res;
}
