'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ProductCard } from '@/components/cards';
import { FollowButton } from '@/components/follow-button';
import { Avatar, Img } from '@/components/img';
import { useApp } from '@/components/providers';
import { ShareButton } from '@/components/share-button';
import { api, errorMessage } from '@/lib/client-api';
import { timeAgo } from '@/lib/format';
import type { FeedPost } from '@/lib/types';

export function PostView({ post }: { post: FeedPost }) {
  const { user, toast } = useApp();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const isOwner = user?.creatorProfile?.handle === post.creator.handle;

  async function remove() {
    if (!confirm('Delete this recommendation? This cannot be undone.')) return;
    setBusy(true);
    try {
      await api(`/posts/${post.id}`, { method: 'DELETE' });
      toast('Recommendation deleted');
      router.replace(`/c/${post.creator.handle}`);
      router.refresh();
    } catch (e) {
      toast(errorMessage(e), 'error');
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div className="overflow-hidden rounded-[2rem] bg-sand shadow-card">
          {post.mediaType === 'VIDEO' ? <video src={post.mediaUrl} poster={post.thumbnailUrl ?? undefined} controls playsInline className="aspect-[4/5] w-full bg-black object-cover" /> : <Img src={post.mediaUrl} alt={post.caption.slice(0, 80)} w={1100} h={1375} priority className="aspect-[4/5] w-full" />}
        </div>
        <div>
          <div className="flex items-center gap-4">
            <Link href={`/c/${post.creator.handle}`} className="flex flex-1 items-center gap-3">
              <Avatar src={post.creator.avatarUrl} name={post.creator.displayName} size={52} />
              <span><span className="block font-semibold">{post.creator.displayName}</span><span className="block text-sm text-muted">@{post.creator.handle} · {timeAgo(post.publishedAt)}</span></span>
            </Link>
            <FollowButton handle={post.creator.handle} size="sm" />
          </div>
          <p className="font-display mt-8 text-2xl leading-snug sm:text-3xl">“{post.caption}”</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ShareButton title={`${post.creator.displayName} recommends`} />
            {isOwner && (<>
              <Link href={`/creator/posts/${post.id}/edit`} className="rounded-full border border-line bg-surface px-5 py-2.5 text-sm font-semibold hover:border-ink">Edit</Link>
              <button onClick={remove} disabled={busy} className="rounded-full border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-bad hover:border-bad disabled:opacity-60">{busy ? 'Deleting…' : 'Delete'}</button>
            </>)}
          </div>
          <h2 className="mt-12 text-sm font-semibold uppercase tracking-[0.12em] text-muted">Featured {post.products.length === 1 ? 'product' : 'products'}</h2>
          <div className="mt-5 grid grid-cols-2 gap-4">{post.products.map((p) => <ProductCard key={p.id} product={p} creatorHandle={post.creator.handle} />)}</div>
        </div>
      </div>
    </div>
  );
}
