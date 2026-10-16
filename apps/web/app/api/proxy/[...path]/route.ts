import { NextRequest } from 'next/server';
import { forward } from '@/lib/server-proxy';

/** Same-origin proxy to the Reccora API (JSON and multipart uploads). Session handling lives in lib/server-proxy. */
async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return forward(req, path.join('/'));
}

export { handle as GET, handle as POST, handle as PATCH, handle as PUT, handle as DELETE };
