'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { AuthShell, Field, FormError, PrimaryButton } from '@/components/forms';
import { useApp } from '@/components/providers';
import { safeNext } from '../login/login-form';

export function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const { reloadUser } = useApp();
  const [role, setRole] = useState<'SHOPPER' | 'CREATOR'>(params.get('role') === 'CREATOR' ? 'CREATOR' : 'SHOPPER');
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const body = { email, password, displayName, role, ...(role === 'CREATOR' ? { handle: handle.trim().toLowerCase() } : {}) };
      const r = await fetch('/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.message ?? 'Could not create your account');
      if (data.emailVerificationRequired) { setNotice('Check your inbox to verify your email, then sign in.'); setLoading(false); return; }
      await reloadUser();
      router.replace(role === 'CREATOR' ? '/creator/profile?welcome=1' : next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your account');
      setLoading(false);
    }
  }

  const seg = (active: boolean) => `flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition ${active ? 'bg-surface shadow-card' : 'text-muted hover:text-ink'}`;
  return (
    <AuthShell title="Join Reccora" subtitle={role === 'CREATOR' ? 'Create your storefront and start recommending products.' : 'Save products and follow the creators you trust.'} image="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80">
      {notice ? <p className="rounded-2xl bg-good/10 px-4 py-4 text-sm text-good">{notice}</p> : (
        <form onSubmit={submit} className="space-y-5">
          <div className="flex rounded-full bg-sand p-1" role="radiogroup" aria-label="Account type">
            <button type="button" role="radio" aria-checked={role === 'SHOPPER'} onClick={() => setRole('SHOPPER')} className={seg(role === 'SHOPPER')}>I’m a shopper</button>
            <button type="button" role="radio" aria-checked={role === 'CREATOR'} onClick={() => setRole('CREATOR')} className={seg(role === 'CREATOR')}>I’m a creator</button>
          </div>
          <Field label="Display name" autoComplete="name" required minLength={2} maxLength={60} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          {role === 'CREATOR' && <Field label="Storefront handle" required pattern="[a-zA-Z0-9_]{3,30}" placeholder="yourname" hint={`Your link: /c/${handle.toLowerCase() || 'yourname'} — letters, numbers and underscores, 3–30 characters.`} value={handle} onChange={(e) => setHandle(e.target.value)} />}
          <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Field label="Password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} hint="At least 8 characters." value={password} onChange={(e) => setPassword(e.target.value)} />
          <FormError message={error} />
          <PrimaryButton type="submit" loading={loading} className="w-full">Create account</PrimaryButton>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-muted">Already have an account? <Link href={`/login${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-ink underline underline-offset-4">Sign in</Link></p>
    </AuthShell>
  );
}
