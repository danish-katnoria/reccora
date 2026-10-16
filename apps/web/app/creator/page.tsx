'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Img } from '@/components/img';
import { useApp } from '@/components/providers';
import { ShareButton } from '@/components/share-button';
import { EmptyState, ErrorState, Skeleton } from '@/components/states';
import { api, errorMessage } from '@/lib/client-api';
import { compact, timeAgo } from '@/lib/format';
import type { CreatorSummary, FeedPost, Paginated } from '@/lib/types';

interface Analytics { followerCount: number; storefrontVisits: number; productClicks: number; periodDays: number }

const badge: Record<string, string> = { PUBLISHED: 'bg-good/10 text-good', DRAFT: 'bg-sand text-muted', REMOVED: 'bg-bad/10 text-bad' };

export default function CreatorStudio() {
  const { user, ready, toast } = useApp();
  const [profile, setProfile] = useState<(CreatorSummary & { status: string }) | null>(null);
  const [stats, setStats] = useState<Analytics | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [p, list] = await Promise.all([api<CreatorSummary & { status: string }>('/creators/me'), api<Paginated<FeedPost>>('/posts/mine?limit=50')]);
      setProfile(p); setPosts(list.items);
      api<Analytics>('/creators/me/analytics?days=30').then(setStats).catch(() => undefined);
    } catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { if (ready && user?.creatorProfile) void load(); else if (ready) setLoading(false); }, [ready, user, load]);

  async function remove(id: string) {
    if (!confirm('Delete this recommendation? This cannot be undone.')) return;
    setDeleting(id);
    try { await api(`/posts/${id}`, { method: 'DELETE' }); setPosts((l) => l.filter((p) => p.id !== id)); toast('Recommendation deleted'); }
    catch (e) { toast(errorMessage(e), 'error'); }
    finally { setDeleting(null); }
  }

  if (ready && user && !user.creatorProfile) {
    return <div className="mx-auto max-w-xl px-4 py-24 text-center"><h1 className="font-display text-3xl">Creator studio</h1><p className="mt-3 text-muted">This area is for creator accounts. Create a creator account to publish recommendations and share your own storefront.</p><Link href="/register?role=CREATOR" className="mt-6 inline-flex rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white">Become a creator</Link></div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Creator studio</p><h1 className="font-display mt-1 text-4xl">Hi, {user?.displayName.split(' ')[0] ?? 'there'}</h1></div>
        <div className="flex flex-wrap gap-3">
          {profile && <ShareButton url={profile.storefrontUrl} title={`${profile.displayName} on Reccora`} label="Share storefront" />}
          <Link href="/creator/new" className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lift hover:bg-accent-deep">+ New recommendation</Link>
        </div>
      </div>

      {error ? <div className="mt-10"><ErrorState message={error} onRetry={load} /></div> : (
        <>
          {profile?.status && profile.status !== 'APPROVED' && <p className="mt-6 rounded-2xl bg-accent-soft px-5 py-3 text-sm text-accent">Your creator account is {profile.status.toLowerCase()}, so your storefront isn’t public yet.</p>}
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[{ l: 'Followers', v: stats?.followerCount ?? profile?.followerCount }, { l: 'Storefront visits · 30d', v: stats?.storefrontVisits }, { l: 'Product clicks · 30d', v: stats?.productClicks }].map((s) => (
              <div key={s.l} className="rounded-3xl border border-line bg-surface p-6 shadow-card"><p className="text-sm text-muted">{s.l}</p><p className="font-display mt-1 text-4xl">{s.v === undefined ? '—' : compact(s.v)}</p></div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4 rounded-3xl border border-line bg-surface p-5">
            {profile && <><div className="min-w-0 flex-1"><p className="text-sm text-muted">Your storefront link</p><p className="truncate font-medium">{profile.storefrontUrl}</p></div>
              <Link href={`/c/${profile.handle}`} className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold hover:border-ink">View storefront</Link>
              <Link href="/creator/profile" className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold hover:border-ink">Edit profile</Link></>}
          </div>

          <h2 className="font-display mt-14 text-2xl">Your recommendations</h2>
          <div className="mt-6">
            {loading ? <div className="grid gap-4 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36" />)}</div>
              : posts.length === 0 ? <EmptyState title="No recommendations yet" body="Choose products from the catalogue, add a photo and publish your first recommendation." action={{ href: '/creator/new', label: 'Create your first' }} />
              : <ul className="grid gap-4 sm:grid-cols-2">
                {posts.map((p) => (
                  <li key={p.id} className="flex gap-4 rounded-3xl border border-line bg-surface p-3 shadow-card">
                    <Link href={p.status === 'PUBLISHED' ? `/post/${p.id}` : `/creator/posts/${p.id}/edit`} className="shrink-0"><Img src={p.thumbnailUrl ?? p.mediaUrl} alt="" w={240} h={300} className="h-32 w-28 rounded-2xl" /></Link>
                    <div className="flex min-w-0 flex-1 flex-col py-1">
                      <div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badge[p.status] ?? badge.DRAFT}`}>{p.status === 'PUBLISHED' ? 'Published' : p.status === 'DRAFT' ? 'Draft' : p.status}</span><span className="text-xs text-muted">{timeAgo(p.publishedAt)}</span></div>
                      <p className="mt-2 line-clamp-2 text-sm">{p.caption}</p>
                      <p className="mt-1 truncate text-xs text-muted">{p.products.map((x) => x.title).join(', ')}</p>
                      <div className="mt-auto flex gap-4 pt-2 text-sm font-semibold">
                        <Link href={`/creator/posts/${p.id}/edit`} className="hover:text-accent">Edit</Link>
                        <button onClick={() => remove(p.id)} disabled={deleting === p.id} className="text-bad hover:underline disabled:opacity-50">{deleting === p.id ? 'Deleting…' : 'Delete'}</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>}
          </div>
        </>
      )}
    </div>
  );
}
