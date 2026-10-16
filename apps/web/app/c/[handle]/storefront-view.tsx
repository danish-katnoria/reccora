'use client';
import Link from 'next/link';
import { useState } from 'react';
import { CollectionCard, ProductGrid } from '@/components/cards';
import { FollowButton } from '@/components/follow-button';
import { Avatar, Img } from '@/components/img';
import { useApp } from '@/components/providers';
import { ShareButton } from '@/components/share-button';
import { EmptyState } from '@/components/states';
import { compact, timeAgo } from '@/lib/format';
import type { Storefront } from '@/lib/types';

type Tab = 'posts' | 'products' | 'collections';

export function StorefrontView({ data }: { data: Storefront }) {
  const { creator: c, products, posts, collections } = data;
  const { user } = useApp();
  const [tab, setTab] = useState<Tab>(posts.length ? 'posts' : 'products');
  const [followers, setFollowers] = useState(c.followerCount ?? 0);
  const isOwner = user?.creatorProfile?.handle === c.handle;
  const share = c.storefrontUrl ?? (typeof window !== 'undefined' ? window.location.href : undefined);
  const tabs: { id: Tab; label: string; n: number }[] = [{ id: 'posts', label: 'Recommendations', n: posts.length }, { id: 'products', label: 'Products', n: products.length }, { id: 'collections', label: 'Collections', n: collections.length }];

  return (
    <div>
      <div className="relative h-56 overflow-hidden bg-ink sm:h-72 lg:h-80">
        <Img src={c.coverUrl ?? c.avatarUrl} alt="" w={1800} h={640} priority className="h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="-mt-14 flex flex-col gap-6 sm:-mt-16 sm:flex-row sm:items-end">
          <Avatar src={c.avatarUrl} name={c.displayName} size={128} className="border-[5px] border-bg shadow-card" />
          <div className="flex-1 pb-1">
            <h1 className="font-display text-4xl leading-tight">{c.displayName}</h1>
            <p className="text-muted">@{c.handle} · <strong className="text-ink">{compact(followers)}</strong> followers · <strong className="text-ink">{products.length}</strong> products</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 pb-1">
            {isOwner ? <Link href="/creator/profile" className="rounded-full border border-line bg-surface px-6 py-2.5 text-sm font-semibold hover:border-ink">Edit profile</Link> : <FollowButton handle={c.handle} onChange={setFollowers} />}
            <ShareButton url={share} title={`${c.displayName} on Reccora`} label="Share storefront" />
          </div>
        </div>
        {c.bio && <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-muted">{c.bio}</p>}
        {isOwner && <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl bg-accent-soft px-5 py-3 text-sm"><span className="font-medium text-accent">This is your public storefront.</span><span className="truncate text-muted">{share}</span><Link href="/creator/new" className="ml-auto font-semibold text-accent underline underline-offset-4">Add a recommendation</Link></div>}

        <div className="mt-10 flex gap-1 overflow-x-auto border-b border-line" role="tablist">
          {tabs.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={`-mb-px shrink-0 border-b-2 px-5 py-3 text-sm font-semibold transition ${tab === t.id ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink'}`}>{t.label} <span className="ml-1 text-xs text-muted">{t.n}</span></button>
          ))}
        </div>

        <div className="py-10">
          {tab === 'posts' && (posts.length === 0 ? <EmptyState title="No recommendations yet" body={isOwner ? 'Publish your first recommendation to show it here.' : `${c.displayName} hasn't published a recommendation yet.`} action={isOwner ? { href: '/creator/new', label: 'Create a recommendation' } : undefined} /> : (
            <div className="columns-2 gap-4 sm:columns-3 lg:columns-4">
              {posts.map((p, i) => (
                <Link key={p.id} href={`/post/${p.id}`} className="group relative mb-4 block break-inside-avoid overflow-hidden rounded-3xl bg-sand shadow-card">
                  <Img src={p.thumbnailUrl ?? p.mediaUrl} alt={p.caption.slice(0, 80)} w={600} h={i % 3 === 1 ? 600 : 780} className={`w-full transition duration-500 group-hover:scale-105 ${i % 3 === 1 ? 'aspect-square' : 'aspect-[4/5]'}`} />
                  <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 via-transparent opacity-0 transition group-hover:opacity-100"><p className="line-clamp-2 p-4 text-sm text-white">{p.caption}<span className="mt-1 block text-xs text-white/70">{timeAgo(p.publishedAt)}</span></p></div>
                </Link>
              ))}
            </div>
          ))}
          {tab === 'products' && (products.length === 0 ? <EmptyState title="No products yet" body="Products appear here once they're recommended." /> : <ProductGrid products={products} creatorHandle={c.handle} />)}
          {tab === 'collections' && (collections.length === 0 ? <EmptyState title="No collections yet" body="Curated collections will appear here." /> : <div className="grid gap-5 md:grid-cols-3">{collections.map((col) => <CollectionCard key={col.id} collection={{ ...col, creator: { handle: c.handle, displayName: c.displayName } }} />)}</div>)}
        </div>
      </div>
    </div>
  );
}
