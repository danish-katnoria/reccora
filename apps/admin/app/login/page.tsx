'use client';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Button, Field, Input } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: f.get('email'), password: f.get('password') }) });
    if (res.ok) {
      router.replace('/');
      router.refresh();
      return;
    }
    const data = await res.json().catch(() => ({}));
    setError(res.status === 429 ? 'Too many attempts. Please wait a minute.' : (data.message ?? 'Login failed'));
    setBusy(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-3xl border border-line bg-surface p-6 shadow-sm">
        <div>
          <div className="text-2xl font-bold tracking-tight">Rec<span className="text-accent">cora</span></div>
          <p className="mt-1 text-sm text-muted">Administrator sign in</p>
        </div>
        <Field label="Email"><Input name="email" type="email" autoComplete="username" required autoFocus /></Field>
        <Field label="Password"><Input name="password" type="password" autoComplete="current-password" required /></Field>
        {error && <p role="alert" className="text-sm text-bad">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>
      </form>
    </main>
  );
}
