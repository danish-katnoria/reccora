'use client';
import { useEffect, useState } from 'react';
import { ProductGrid } from '@/components/cards';
import { useApp } from '@/components/providers';
import { EmptyState, ErrorState, ProductGridSkeleton } from '@/components/states';
import { api, errorMessage } from '@/lib/client-api';
import type { Paginated, Product } from '@/lib/types';

export default function SavedPage() {
  const { user, ready, savedIds, libraryReady } = useApp();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<Paginated<Product>['meta'] | null>(null);
  const [more, setMore] = useState(false);

  async function load(page: number) {
    if (page === 1) setLoading(true); else setMore(true);
    setError(null);
    try {
      const r = await api<Paginated<Product>>(`/saved/products?page=${page}&limit=12`);
      setItems((prev) => (page === 1 ? r.items : [...prev, ...r.items]));
      setMeta(r.meta);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false); setMore(false);
    }
  }
  useEffect(() => { if (ready && user) void load(1); }, [ready, user]);

  // Un-saving from this page removes the card straight away; the server list is the source of truth on reload.
  const visible = libraryReady ? items.filter((p) => savedIds.has(p.id)) : items;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl sm:text-5xl">Saved</h1>
      <p className="mt-2 text-muted">Products you’ve bookmarked, ready when you are.</p>
      <div className="mt-10 min-h-[40vh]">
        {loading || !ready ? <ProductGridSkeleton count={4} />
          : error ? <ErrorState message={error} onRetry={() => load(1)} />
          : visible.length === 0 ? <EmptyState title="Nothing saved yet" body="Tap the heart on any product to keep it here." action={{ href: '/explore', label: 'Explore products' }} />
          : (<>
            <p className="mb-5 text-sm text-muted">{visible.length}{meta?.hasMore ? '+' : ''} saved</p>
            <ProductGrid products={visible} />
            {meta?.hasMore && <div className="mt-12 text-center"><button onClick={() => load((meta.page ?? 1) + 1)} disabled={more} className="rounded-full border border-ink px-8 py-3 text-sm font-semibold hover:bg-ink hover:text-white disabled:opacity-60">{more ? 'Loading…' : 'Load more'}</button></div>}
          </>)}
      </div>
    </div>
  );
}
