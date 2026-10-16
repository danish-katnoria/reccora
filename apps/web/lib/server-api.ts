import { notFound } from 'next/navigation';

const API_URL = process.env.API_URL ?? 'http://localhost:3000/api/v1';

export class ServerApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Server-side read from the Reccora API (public data; user-specific state is hydrated in the browser). */
export async function sget<T>(path: string, opts: { revalidate?: number | false } = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, opts.revalidate === false ? { cache: 'no-store' } : { next: { revalidate: opts.revalidate ?? 30 } });
  if (res.status === 404) notFound();
  if (!res.ok) throw new ServerApiError(res.status, `API ${res.status} for ${path}`);
  return (await res.json()) as T;
}

/** Same as sget but resolves to a fallback instead of throwing, so one failed section never blanks a page. */
export async function sgetSafe<T>(path: string, fallback: T, opts: { revalidate?: number | false } = {}): Promise<T> {
  try {
    const res = await fetch(`${API_URL}${path}`, opts.revalidate === false ? { cache: 'no-store' } : { next: { revalidate: opts.revalidate ?? 30 } });
    return res.ok ? ((await res.json()) as T) : fallback;
  } catch {
    return fallback;
  }
}
