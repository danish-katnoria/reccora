'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Avatar, Img } from '@/components/img';
import { FormError, TextArea } from '@/components/forms';
import { ImageUpload } from '@/components/image-upload';
import { ProductPicker } from '@/components/product-picker';
import { useApp } from '@/components/providers';
import { api, errorMessage } from '@/lib/client-api';
import { money } from '@/lib/format';
import type { FeedPost, Product } from '@/lib/types';

/** Create or edit a recommendation: choose products → add photo + caption → preview → publish. */
export function Composer({ existing }: { existing?: FeedPost }) {
  const router = useRouter();
  const { user, ready, toast } = useApp();
  const [products, setProducts] = useState<Product[]>(existing?.products ?? []);
  const [mediaUrl, setMediaUrl] = useState<string | null>(existing?.mediaUrl ?? null);
  const [caption, setCaption] = useState(existing?.caption ?? '');
  const [picker, setPicker] = useState(false);
  const [saving, setSaving] = useState<null | 'PUBLISHED' | 'DRAFT'>(null);
  const [error, setError] = useState<string | null>(null);
  const editing = !!existing;

  if (ready && user && !user.creatorProfile) {
    return <div className="mx-auto max-w-xl px-4 py-24 text-center"><h1 className="font-display text-3xl">Creator account required</h1><p className="mt-3 text-muted">Only creator accounts can publish recommendations.</p><Link href="/register?role=CREATOR" className="mt-6 inline-flex rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white">Become a creator</Link></div>;
  }
  if (ready && user?.creatorProfile && user.creatorProfile.status !== 'APPROVED') {
    return <div className="mx-auto max-w-xl px-4 py-24 text-center"><h1 className="font-display text-3xl">Awaiting approval</h1><p className="mt-3 text-muted">Your creator account is {user.creatorProfile.status.toLowerCase()}. You’ll be able to publish once it’s approved.</p></div>;
  }

  const valid = products.length > 0 && !!mediaUrl && caption.trim().length > 0;

  async function save(status: 'PUBLISHED' | 'DRAFT') {
    setError(null);
    if (!products.length) return setError('Choose at least one product to recommend.');
    if (!mediaUrl) return setError('Add a photo for your recommendation.');
    if (!caption.trim()) return setError('Write a short caption.');
    setSaving(status);
    try {
      const body = { caption: caption.trim(), mediaUrl, mediaType: 'IMAGE', productIds: products.map((p) => p.id), status };
      const post = editing ? await api<FeedPost>(`/posts/${existing.id}`, { method: 'PATCH', json: body }) : await api<FeedPost>('/posts', { json: body });
      toast(status === 'PUBLISHED' ? 'Recommendation published' : 'Draft saved');
      router.push(status === 'PUBLISHED' ? `/post/${post.id}` : '/creator');
      router.refresh();
    } catch (e) {
      setError(errorMessage(e)); setSaving(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link href="/creator" className="text-sm font-medium text-muted hover:text-ink">← Creator studio</Link>
      <h1 className="font-display mt-2 text-4xl">{editing ? 'Edit recommendation' : 'New recommendation'}</h1>
      <p className="mt-2 text-muted">Pick products from the catalogue, add a photo and tell people why you love them.</p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.15fr_1fr]">
        <div className="space-y-9">
          <section aria-labelledby="s1">
            <h2 id="s1" className="mb-3 flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.12em] text-muted"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-xs text-white">1</span>Products</h2>
            {products.length > 0 && (
              <ul className="mb-4 space-y-3">
                {products.map((p) => (
                  <li key={p.id} className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-3">
                    <Img src={p.imageUrl} alt={p.title} w={140} h={140} className="h-16 w-16 shrink-0 rounded-xl" />
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{p.title}</p><p className="text-sm text-muted">{money(p.price, p.currency)} · {p.merchantName}</p></div>
                    <button onClick={() => setProducts((l) => l.filter((x) => x.id !== p.id))} aria-label={`Remove ${p.title}`} className="rounded-full px-3 py-1 text-sm text-muted hover:bg-sand hover:text-bad">Remove</button>
                  </li>
                ))}
              </ul>
            )}
            <button onClick={() => setPicker(true)} className="rounded-full border border-ink px-6 py-3 text-sm font-semibold hover:bg-ink hover:text-white">{products.length ? 'Change products' : 'Browse catalogue'}</button>
          </section>

          <section aria-labelledby="s2">
            <h2 id="s2" className="mb-3 flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.12em] text-muted"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-xs text-white">2</span>Photo &amp; caption</h2>
            <div className="max-w-sm"><ImageUpload label="Photo" purpose="post" value={mediaUrl} onChange={setMediaUrl} /></div>
            <div className="mt-6"><TextArea label="Caption" rows={4} maxLength={1000} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Why do you recommend this?" hint={`${caption.length}/1000`} /></div>
          </section>

          <FormError message={error} />
          <div className="flex flex-wrap gap-3">
            <button onClick={() => save('PUBLISHED')} disabled={!!saving || !valid} className="inline-flex items-center gap-2 rounded-full bg-accent px-8 py-3.5 text-sm font-semibold text-white shadow-lift hover:bg-accent-deep disabled:cursor-not-allowed disabled:opacity-50">{saving === 'PUBLISHED' ? 'Publishing…' : editing && existing.status === 'PUBLISHED' ? 'Save changes' : 'Publish'}</button>
            {(!editing || existing.status !== 'PUBLISHED') && <button onClick={() => save('DRAFT')} disabled={!!saving || !valid} className="rounded-full border border-line bg-surface px-7 py-3.5 text-sm font-semibold hover:border-ink disabled:opacity-50">{saving === 'DRAFT' ? 'Saving…' : 'Save draft'}</button>}
          </div>
        </div>

        {/* Live preview */}
        <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="Preview">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-muted">Preview</p>
          <article className="overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
            <div className="flex items-center gap-3 px-4 py-3"><Avatar src={user?.avatarUrl} name={user?.displayName ?? 'You'} size={36} /><span><span className="block text-sm font-semibold">{user?.displayName ?? 'You'}</span><span className="block text-xs text-muted">just now</span></span></div>
            {mediaUrl ? <img src={mediaUrl} alt="" className="aspect-[4/5] w-full object-cover" /> : <div className="flex aspect-[4/5] items-center justify-center bg-sand text-sm text-muted">Your photo appears here</div>}
            <div className="p-4">
              <p className="min-h-5 text-sm">{caption || <span className="text-muted">Your caption appears here</span>}</p>
              {products[0] && <div className="mt-3 flex items-center gap-3 rounded-2xl bg-sand p-2 pr-4"><Img src={products[0].imageUrl} alt="" w={120} h={120} className="h-14 w-14 rounded-xl" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{products[0].title}</span><span className="block text-sm font-semibold text-accent">{money(products[0].price, products[0].currency)}</span></span>{products.length > 1 && <span className="text-xs font-semibold text-muted">+{products.length - 1} more</span>}</div>}
            </div>
          </article>
        </aside>
      </div>
      {picker && <ProductPicker selected={products} onClose={() => setPicker(false)} onChange={setProducts} />}
    </div>
  );
}
