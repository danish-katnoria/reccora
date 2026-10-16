'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Field, FormError, PrimaryButton } from '@/components/forms';
import { ImageUpload } from '@/components/image-upload';
import { useApp } from '@/components/providers';
import { Skeleton } from '@/components/states';
import { api, errorMessage } from '@/lib/client-api';

export default function ProfilePage() {
  const { user, ready, reloadUser, logout, toast } = useApp();
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isProfilePrivate, setPrivate] = useState(false);
  const [showActivity, setShowActivity] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => { if (user) { setDisplayName(user.displayName); setAvatarUrl(user.avatarUrl); setPrivate(!!user.isProfilePrivate); setShowActivity(user.showActivity !== false); } }, [user]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      await api('/users/me', { method: 'PATCH', json: { displayName: displayName.trim(), isProfilePrivate, showActivity, ...(avatarUrl ? { avatarUrl } : {}) } });
      await reloadUser(); toast('Profile updated');
    } catch (err) { setError(errorMessage(err)); }
    finally { setSaving(false); }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwBusy(true); setPwError(null);
    try {
      await api('/users/me/password', { json: { currentPassword: cur, newPassword: next } });
      toast('Password changed. Please sign in again.');
      await logout();
    } catch (err) { setPwError(errorMessage(err)); setPwBusy(false); }
  }

  if (!ready || !user) return <div className="mx-auto max-w-2xl px-4 py-12"><Skeleton className="h-96" /></div>;
  const toggle = (on: boolean, set: (v: boolean) => void, label: string, hint: string) => (
    <label className="flex cursor-pointer items-start justify-between gap-6 rounded-2xl border border-line bg-surface p-4">
      <span><span className="block text-sm font-semibold">{label}</span><span className="text-xs text-muted">{hint}</span></span>
      <input type="checkbox" role="switch" checked={on} onChange={(e) => set(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-accent)]" />
    </label>
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl">Profile &amp; settings</h1>
      <p className="mt-2 text-muted">{user.email} · {user.role === 'CREATOR' ? 'Creator account' : user.role === 'ADMIN' ? 'Administrator' : 'Shopper account'}</p>

      {user.creatorProfile && (
        <div className="mt-8 flex flex-wrap items-center gap-3 rounded-3xl bg-accent-soft p-5">
          <p className="min-w-0 flex-1 text-sm font-medium text-accent">You’re a creator · @{user.creatorProfile.handle}</p>
          <Link href="/creator" className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-accent-deep">Creator studio</Link>
          <Link href="/creator/profile" className="rounded-full border border-accent/30 px-5 py-2 text-sm font-semibold text-accent hover:bg-white">Edit storefront</Link>
        </div>
      )}

      <form onSubmit={save} className="mt-10 space-y-6">
        <ImageUpload label="Profile photo" purpose="avatar" shape="circle" value={avatarUrl} onChange={setAvatarUrl} name={displayName} />
        <Field label="Display name" required minLength={2} maxLength={60} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        {toggle(isProfilePrivate, setPrivate, 'Private profile', 'Hide your profile details from other people.')}
        {toggle(showActivity, setShowActivity, 'Show my activity', 'Let creators see when you follow them.')}
        <FormError message={error} />
        <PrimaryButton type="submit" loading={saving}>Save changes</PrimaryButton>
      </form>

      <form onSubmit={changePassword} className="mt-14 space-y-5 border-t border-line pt-10">
        <h2 className="font-display text-2xl">Change password</h2>
        <Field label="Current password" type="password" autoComplete="current-password" required value={cur} onChange={(e) => setCur(e.target.value)} />
        <Field label="New password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={next} onChange={(e) => setNext(e.target.value)} />
        <FormError message={pwError} />
        <PrimaryButton type="submit" loading={pwBusy} className="bg-surface !text-ink border border-line hover:!bg-sand">Update password</PrimaryButton>
      </form>

      <div className="mt-14 border-t border-line pt-8"><button onClick={logout} className="rounded-full border border-line bg-surface px-6 py-3 text-sm font-semibold text-bad hover:border-bad">Sign out</button></div>
    </div>
  );
}
