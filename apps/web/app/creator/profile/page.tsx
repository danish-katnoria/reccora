'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Field, FormError, PrimaryButton, TextArea } from '@/components/forms';
import { ImageUpload } from '@/components/image-upload';
import { useApp } from '@/components/providers';
import { ErrorState, Skeleton } from '@/components/states';
import { api, errorMessage } from '@/lib/client-api';
import type { CreatorSummary } from '@/lib/types';

function Form() {
  const { user, ready, reloadUser, toast } = useApp();
  const welcome = useSearchParams().get('welcome') === '1';
  const [p, setP] = useState<CreatorSummary | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ready || !user?.creatorProfile) return;
    api<CreatorSummary>('/creators/me').then((c) => { setP(c); setDisplayName(c.displayName); setHandle(c.handle); setBio(c.bio ?? ''); setAvatarUrl(c.avatarUrl); setCoverUrl(c.coverUrl ?? null); }).catch((e) => setLoadError(errorMessage(e)));
  }, [ready, user]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const body: Record<string, string> = { displayName: displayName.trim(), handle: handle.trim().toLowerCase(), bio };
      if (avatarUrl) body.avatarUrl = avatarUrl;
      if (coverUrl) body.coverUrl = coverUrl;
      const c = await api<CreatorSummary>('/creators/me', { method: 'PATCH', json: body });
      setP(c); await reloadUser(); toast('Profile saved');
    } catch (err) { setError(errorMessage(err)); }
    finally { setSaving(false); }
  }

  if (ready && user && !user.creatorProfile) return <div className="mx-auto max-w-xl px-4 py-24 text-center"><p className="text-muted">Only creator accounts have a creator profile.</p></div>;
  if (loadError) return <div className="mx-auto max-w-2xl px-4 py-16"><ErrorState message={loadError} /></div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/creator" className="text-sm font-medium text-muted hover:text-ink">← Creator studio</Link>
      <h1 className="font-display mt-2 text-4xl">{welcome ? 'Set up your storefront' : 'Creator profile'}</h1>
      <p className="mt-2 text-muted">This is what shoppers see on your public storefront.</p>
      {!p ? <Skeleton className="mt-10 h-96" /> : (
        <form onSubmit={save} className="mt-10 space-y-8">
          <ImageUpload label="Profile photo" purpose="avatar" shape="circle" value={avatarUrl} onChange={setAvatarUrl} name={displayName} />
          <ImageUpload label="Cover image" purpose="avatar" aspect="aspect-[16/6]" value={coverUrl} onChange={setCoverUrl} />
          <Field label="Display name" required minLength={2} maxLength={60} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          <Field label="Handle" required pattern="[a-zA-Z0-9_]{3,30}" hint={`Your storefront: ${p.storefrontUrl?.replace(/\/c\/.*$/, '')}/c/${handle.toLowerCase()}`} value={handle} onChange={(e) => setHandle(e.target.value)} />
          <TextArea label="Bio" rows={4} maxLength={500} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="What do you recommend, and why should people trust your taste?" hint={`${bio.length}/500`} />
          <FormError message={error} />
          <div className="flex flex-wrap gap-3">
            <PrimaryButton type="submit" loading={saving}>Save profile</PrimaryButton>
            <Link href={`/c/${handle || p.handle}`} className="rounded-full border border-line bg-surface px-7 py-3.5 text-sm font-semibold hover:border-ink">View storefront</Link>
            {welcome && <Link href="/creator/new" className="rounded-full bg-accent px-7 py-3.5 text-sm font-semibold text-white hover:bg-accent-deep">Create first recommendation →</Link>}
          </div>
        </form>
      )}
    </div>
  );
}

export default function CreatorProfilePage() { return <Suspense><Form /></Suspense>; }
