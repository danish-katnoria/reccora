'use client';
import { useState } from 'react';
import { useApp } from './providers';

export function FollowButton({ handle, ownerUserId, onChange, size = 'md' }: { handle: string; ownerUserId?: string; onChange?: (count: number) => void; size?: 'sm' | 'md' }) {
  const { followingHandles, toggleFollow, user } = useApp();
  const [busy, setBusy] = useState(false);
  const following = followingHandles.has(handle);
  if (user?.creatorProfile?.handle === handle || (ownerUserId && user?.id === ownerUserId)) return null;
  const pad = size === 'sm' ? 'px-4 py-1.5 text-xs' : 'px-6 py-2.5 text-sm';

  async function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    const r = await toggleFollow(handle);
    if (r) onChange?.(r.followerCount);
    setBusy(false);
  }
  return (
    <button onClick={onClick} disabled={busy} aria-pressed={following} className={`rounded-full font-semibold transition disabled:opacity-60 ${pad} ${following ? 'border border-line bg-surface text-ink hover:border-bad hover:text-bad' : 'bg-ink text-white hover:bg-black'}`}>
      {following ? 'Following' : 'Follow'}
    </button>
  );
}
