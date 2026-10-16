'use client';
import { useEffect, useRef, useState } from 'react';
import { api, errorMessage, qs } from '@/lib/client-api';
import { money } from '@/lib/format';
import type { Category, Paginated, Product } from '@/lib/types';
import { Img } from './img';
import { EmptyState, ErrorState, Skeleton } from './states';

/** Modal catalogue browser for choosing which products a recommendation features. */
export function ProductPicker({ selected, max = 5, onClose, onChange }: { selected: Product[]; max?: number; onClose: () => void; onChange: (p: Product[]) => void }) {
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Product[]>([]);
  const [meta, setMeta] = useState<Paginated<Product>['meta'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Product[]>(selected);
  const req = useRef(0);

  useEffect(() => { api<Category[]>('/categories').then(setCategories).catch(() => undefined); }, []);

  async function load(page: number, term: string, cat: string) {
    const id = ++req.current;
    if (page === 1) setLoading(true);
    setError(null);
    try {
      const r = await api<Paginated<Product>>(`/products${qs({ q: term, category: cat, page, limit: 12 })}`);
      if (id !== req.current) return;
      setItems((prev) => (page === 1 ? r.items : [...prev, ...r.items])); setMeta(r.meta);
    } catch (e) { if (id === req.current) setError(errorMessage(e)); }
    finally { if (id === req.current) setLoading(false); }
  }
  useEffect(() => { const t = setTimeout(() => void load(1, q.trim(), category), 250); return () => clearTimeout(t); }, [q, category]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  const has = (id: string) => draft.some((p) => p.id === id);
  const toggle = (p: Product) => setDraft((d) => (d.some((x) => x.id === p.id) ? d.filter((x) => x.id !== p.id) : d.length >= max ? d : [...d, p]));

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Choose products">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-[2rem] bg-bg shadow-lift sm:rounded-[2rem]">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div><h2 className="font-display text-2xl">Choose products</h2><p className="text-sm text-muted">{draft.length} of {max} selected</p></div>
          <button onClick={onClose} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-sand">✕</button>
        </div>
        <div className="space-y-3 border-b border-line px-6 py-4">
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the catalogue" aria-label="Search products" className="w-full rounded-full border border-line bg-surface px-5 py-2.5 text-sm outline-none focus:border-ink" />
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {[{ id: '', name: 'All', slug: '' }, ...categories].map((c) => <button key={c.id || 'all'} onClick={() => setCategory(c.slug)} className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium ${category === c.slug ? 'border-ink bg-ink text-white' : 'border-line bg-surface hover:border-ink'}`}>{c.name}</button>)}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-[4/5]" />)}</div>
            : error ? <ErrorState message={error} onRetry={() => load(1, q.trim(), category)} />
            : items.length === 0 ? <EmptyState title="No matching products" body="Try a different search or category." />
            : (<>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {items.map((p) => {
                  const on = has(p.id);
                  return (
                    <button key={p.id} onClick={() => toggle(p)} aria-pressed={on} className={`relative overflow-hidden rounded-2xl border-2 bg-surface text-left transition ${on ? 'border-accent shadow-card' : 'border-transparent hover:border-line'}`}>
                      <Img src={p.imageUrl} alt={p.title} w={360} h={450} className="aspect-[4/5] w-full" />
                      <div className="p-3"><p className="line-clamp-2 text-sm font-medium">{p.title}</p><p className="text-sm font-semibold text-accent">{money(p.price, p.currency)}</p></div>
                      {on && <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-sm text-white">✓</span>}
                    </button>
                  );
                })}
              </div>
              {meta?.hasMore && <div className="mt-6 text-center"><button onClick={() => load((meta.page ?? 1) + 1, q.trim(), category)} className="rounded-full border border-ink px-6 py-2 text-sm font-semibold hover:bg-ink hover:text-white">Load more</button></div>}
            </>)}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-line bg-surface px-6 py-4">
          <button onClick={() => setDraft([])} className="text-sm font-semibold text-muted hover:text-ink">Clear</button>
          <button onClick={() => { onChange(draft); onClose(); }} disabled={draft.length === 0} className="rounded-full bg-accent px-7 py-3 text-sm font-semibold text-white hover:bg-accent-deep disabled:opacity-50">Use {draft.length || ''} {draft.length === 1 ? 'product' : 'products'}</button>
        </div>
      </div>
    </div>
  );
}
