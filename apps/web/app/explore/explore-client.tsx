'use client';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CollectionCard, CreatorCard, ProductGrid } from '@/components/cards';
import { EmptyState, ErrorState, ProductGridSkeleton, Skeleton } from '@/components/states';
import { api, errorMessage, qs } from '@/lib/client-api';
import type { Category, CollectionSummary, CreatorSummary, Paginated, Product, SearchResults } from '@/lib/types';

const SORTS = [{ v: 'newest', l: 'Newest' }, { v: 'popular', l: 'Most saved' }, { v: 'price_asc', l: 'Price: low to high' }, { v: 'price_desc', l: 'Price: high to low' }];

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

export function ExploreClient({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tab = params.get('tab') === 'creators' ? 'creators' : 'products';
  const category = params.get('category') ?? '';
  const sort = params.get('sort') ?? 'newest';
  const urlQ = params.get('q') ?? '';

  const [input, setInput] = useState(urlQ);
  useEffect(() => setInput(urlQ), [urlQ]);
  const q = useDebounced(input.trim(), 300);

  const setParam = useCallback((patch: Record<string, string | null>) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) { if (v) p.set(k, v); else p.delete(k); }
    router.replace(`${pathname}${p.toString() ? `?${p}` : ''}`, { scroll: false });
  }, [params, pathname, router]);

  // Keep ?q= in sync with the (debounced) input.
  useEffect(() => { if (q !== urlQ) setParam({ q: q || null }); }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- products (server-side filtered + paginated) ----
  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState<Paginated<Product>['meta'] | null>(null);
  const [pLoading, setPLoading] = useState(true);
  const [pMore, setPMore] = useState(false);
  const [pError, setPError] = useState<string | null>(null);
  const reqId = useRef(0);

  const loadProducts = useCallback(async (page: number) => {
    const id = ++reqId.current;
    if (page === 1) setPLoading(true); else setPMore(true);
    setPError(null);
    try {
      const r = await api<Paginated<Product>>(`/products${qs({ q: urlQ, category, sort, page, limit: 12 })}`, { quiet401: true });
      if (id !== reqId.current) return;
      setProducts((prev) => (page === 1 ? r.items : [...prev, ...r.items]));
      setMeta(r.meta);
    } catch (e) {
      if (id === reqId.current) setPError(errorMessage(e));
    } finally {
      if (id === reqId.current) { setPLoading(false); setPMore(false); }
    }
  }, [urlQ, category, sort]);

  useEffect(() => { if (tab === 'products') void loadProducts(1); }, [tab, loadProducts]);

  // ---- creators + collections ----
  const [creators, setCreators] = useState<CreatorSummary[]>([]);
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [cLoading, setCLoading] = useState(false);
  const [cError, setCError] = useState<string | null>(null);

  const loadCreators = useCallback(async () => {
    setCLoading(true);
    setCError(null);
    try {
      if (urlQ) {
        const r = await api<SearchResults>(`/search${qs({ q: urlQ, limit: 30 })}`, { quiet401: true });
        setCreators(r.creators); setCollections(r.collections);
      } else {
        const [c, col] = await Promise.all([api<Paginated<CreatorSummary>>('/creators/trending?limit=24', { quiet401: true }), api<Paginated<CollectionSummary>>('/collections/popular?limit=6', { quiet401: true })]);
        setCreators(c.items); setCollections(col.items);
      }
    } catch (e) {
      setCError(errorMessage(e));
    } finally {
      setCLoading(false);
    }
  }, [urlQ]);
  useEffect(() => { if (tab === 'creators') void loadCreators(); }, [tab, loadCreators]);

  const chip = (active: boolean) => `shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${active ? 'border-ink bg-ink text-white' : 'border-line bg-surface hover:border-ink'}`;
  const activeCat = categories.find((c) => c.slug === category);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl sm:text-5xl">{tab === 'creators' ? 'Creators' : activeCat ? activeCat.name : 'Explore'}</h1>
      <p className="mt-2 text-muted">{tab === 'creators' ? 'Find the voices behind the recommendations.' : 'Everything creators are recommending, in one place.'}</p>

      <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center">
        <div role="tablist" className="inline-flex w-fit rounded-full bg-sand p-1">
          {(['products', 'creators'] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setParam({ tab: t === 'products' ? null : t })} className={`rounded-full px-5 py-2 text-sm font-semibold capitalize transition ${tab === t ? 'bg-surface shadow-card' : 'text-muted hover:text-ink'}`}>{t}</button>
          ))}
        </div>
        <div className="relative flex-1">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={tab === 'creators' ? 'Search creators by name or handle' : 'Search products, brands, merchants'} aria-label="Search" className="w-full rounded-full border border-line bg-surface py-3 pl-5 pr-12 text-sm outline-none transition focus:border-ink" />
          {input && <button onClick={() => setInput('')} aria-label="Clear search" className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-sand">✕</button>}
        </div>
        {tab === 'products' && (
          <select value={sort} onChange={(e) => setParam({ sort: e.target.value === 'newest' ? null : e.target.value })} aria-label="Sort" className="rounded-full border border-line bg-surface px-4 py-3 text-sm font-medium outline-none focus:border-ink">
            {SORTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
        )}
      </div>

      {tab === 'products' && (
        <>
          <div className="no-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label="Categories">
            <button onClick={() => setParam({ category: null })} className={chip(!category)}>All</button>
            {categories.map((c) => <button key={c.id} onClick={() => setParam({ category: c.slug })} aria-pressed={category === c.slug} className={chip(category === c.slug)}>{c.name}</button>)}
          </div>
          <div className="mt-8 min-h-[40vh]">
            {pLoading ? <ProductGridSkeleton count={8} />
              : pError ? <ErrorState message={pError} onRetry={() => loadProducts(1)} />
              : products.length === 0 ? <EmptyState title="No products found" body={urlQ ? `Nothing matched “${urlQ}”${activeCat ? ` in ${activeCat.name}` : ''}. Try a different search or clear the filters.` : 'There are no products in this category yet.'} action={{ href: '/explore', label: 'Clear filters' }} />
              : (
                <>
                  <p className="mb-5 text-sm text-muted">{meta?.total} {meta?.total === 1 ? 'product' : 'products'}</p>
                  <ProductGrid products={products} />
                  {meta?.hasMore && <div className="mt-12 text-center"><button onClick={() => loadProducts((meta?.page ?? 1) + 1)} disabled={pMore} className="rounded-full border border-ink px-8 py-3 text-sm font-semibold hover:bg-ink hover:text-white disabled:opacity-60">{pMore ? 'Loading…' : 'Load more'}</button></div>}
                </>
              )}
          </div>
        </>
      )}

      {tab === 'creators' && (
        <div className="mt-8 min-h-[40vh]">
          {cLoading ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64" />)}</div>
            : cError ? <ErrorState message={cError} onRetry={loadCreators} />
            : creators.length === 0 ? <EmptyState title="No creators found" body={urlQ ? `No creators matched “${urlQ}”.` : 'No creators yet.'} action={{ href: '/explore?tab=creators', label: 'Show all creators' }} />
            : (
              <>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{creators.map((c) => <CreatorCard key={c.id} creator={c} />)}</div>
                {collections.length > 0 && (
                  <div className="mt-16"><h2 className="font-display mb-6 text-2xl">{urlQ ? 'Matching collections' : 'Popular collections'}</h2>
                    <div className="grid gap-5 md:grid-cols-3">{collections.map((c) => <CollectionCard key={c.id} collection={c} />)}</div></div>
                )}
              </>
            )}
        </div>
      )}
      {tab === 'products' && urlQ && !pLoading && (
        <p className="mt-10 text-sm text-muted">Looking for a person instead? <Link className="font-semibold text-ink underline underline-offset-4" href={`/explore?tab=creators&q=${encodeURIComponent(urlQ)}`}>Search creators for “{urlQ}”</Link></p>
      )}
    </div>
  );
}
