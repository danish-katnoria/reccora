'use client';

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: string[]) {
    super(message);
  }
}

export type Query = Record<string, string | number | boolean | undefined | null>;

export function qs(params: Query) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
}

type Listener = () => void;
const sessionLostListeners = new Set<Listener>();
/** Called when the proxy reports the session is gone (expired refresh token). */
export const onSessionLost = (cb: Listener) => { sessionLostListeners.add(cb); return () => { sessionLostListeners.delete(cb); }; };

async function parse(res: Response) {
  const text = await res.text();
  try { return text ? JSON.parse(text) : null; } catch { return null; }
}

/** Calls the Reccora API through the same-origin proxy, which attaches (and refreshes) the httpOnly session. */
export async function api<T = unknown>(path: string, opts: { method?: string; json?: unknown; form?: FormData; quiet401?: boolean } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/proxy${path}`, {
      method: opts.method ?? (opts.json !== undefined || opts.form ? 'POST' : 'GET'),
      headers: opts.form ? undefined : opts.json !== undefined ? { 'content-type': 'application/json' } : undefined,
      body: opts.form ?? (opts.json !== undefined ? JSON.stringify(opts.json) : undefined),
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(0, 'Network error. Check your connection and try again.');
  }
  const data = await parse(res);
  if (res.status === 401 && !opts.quiet401) sessionLostListeners.forEach((cb) => cb());
  if (!res.ok) {
    const msg = Array.isArray(data?.message) ? data.message[0] : data?.message;
    throw new ApiError(res.status, msg ?? res.statusText ?? 'Request failed', Array.isArray(data?.details) ? data.details : undefined);
  }
  return data as T;
}

export async function uploadImage(file: File, purpose: 'avatar' | 'post'): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const r = await api<{ url: string }>(`/uploads?purpose=${purpose}`, { form });
  return r.url;
}

export const errorMessage = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
