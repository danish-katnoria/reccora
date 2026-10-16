import { NextRequest, NextResponse } from 'next/server';

const API_PUBLIC_URL = (process.env.API_PUBLIC_URL ?? 'http://localhost:3000').replace(/\/$/, '');

/**
 * "Shop Product" entry point. Hands the browser to the API's click-tracking redirect, which records the click and
 * 302s to the product's approved merchant URL. There is no checkout on Reccora.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const target = new URL(`${API_PUBLIC_URL}/api/v1/go/${encodeURIComponent(id)}`);
  for (const k of ['creator', 'post', 'source']) {
    const v = req.nextUrl.searchParams.get(k);
    if (v) target.searchParams.set(k, v);
  }
  if (!target.searchParams.has('source')) target.searchParams.set('source', 'web');
  return NextResponse.redirect(target, 307);
}
