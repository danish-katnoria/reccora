import type { Metadata } from 'next';
import Link from 'next/link';
import { Avatar, Img } from '@/components/img';
import { Gallery } from '@/components/gallery';
import { ProductGrid } from '@/components/cards';
import { SaveButton } from '@/components/save-button';
import { ShareButton } from '@/components/share-button';
import { SectionHeader } from '@/components/states';
import { money } from '@/lib/format';
import { sget } from '@/lib/server-api';
import type { ProductDetail } from '@/lib/types';

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ creator?: string; post?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const p = await sget<ProductDetail>(`/products/${id}`);
    return { title: p.title, description: p.description?.slice(0, 160) ?? undefined, openGraph: { title: p.title, images: p.imageUrl ? [p.imageUrl] : undefined } };
  } catch { return { title: 'Product' }; }
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const p = await sget<ProductDetail>(`/products/${id}`, { revalidate: false });

  // Credit the creator who brought the shopper here; otherwise the most recent recommender.
  const from = p.recommendedBy.find((r) => r.creator.handle === sp.creator) ?? p.recommendedBy[0];
  const q = new URLSearchParams({ source: 'web' });
  if (from) { q.set('creator', from.creator.handle); q.set('post', from.postId); }
  const shopHref = `/go/${p.id}?${q}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted">
        <Link href="/explore" className="hover:text-ink">Explore</Link>
        {p.category && <> <span aria-hidden>/</span> <Link href={`/explore?category=${p.category.slug}`} className="hover:text-ink">{p.category.name}</Link></>}
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <Gallery images={p.images} title={p.title} />

        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{[p.brand?.name, p.category?.name].filter(Boolean).join(' · ')}</p>
          <h1 className="font-display mt-2 text-4xl leading-tight sm:text-5xl">{p.title}</h1>
          <p className="mt-4 text-3xl font-semibold">{money(p.price, p.currency)}</p>
          <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-1.5 text-sm"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9h18M9 20v-6h6v6" /></svg>Sold by <strong>{p.merchantName}</strong></p>
          {p.description && <p className="mt-6 text-[15px] leading-relaxed text-muted">{p.description}</p>}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {p.purchasable ? (
              <a href={shopHref} target="_blank" rel="sponsored nofollow noopener" className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-accent px-8 py-4 text-base font-semibold text-white shadow-lift transition hover:bg-accent-deep">
                Shop Product
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M7 17 17 7M8 7h9v9" /></svg>
              </a>
            ) : (
              <span className="inline-flex flex-1 cursor-not-allowed items-center justify-center rounded-full bg-sand px-8 py-4 text-base font-semibold text-muted" aria-disabled>Currently unavailable</span>
            )}
            <SaveButton productId={p.id} variant="pill" />
            <ShareButton title={p.title} />
          </div>
          <p className="mt-3 text-xs text-muted">You’ll complete your purchase on {p.merchantName}’s website. Reccora may earn a commission.</p>

          {p.recommendedBy.length > 0 && (
            <div className="mt-10 rounded-3xl border border-line bg-surface p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted">Recommended by</h2>
              <ul className="mt-4 space-y-4">
                {p.recommendedBy.slice(0, 4).map((r) => (
                  <li key={r.creator.id}>
                    <Link href={`/post/${r.postId}`} className="flex gap-4 rounded-2xl p-1 transition hover:bg-sand">
                      {(r.thumbnailUrl ?? r.mediaUrl) && <Img src={r.thumbnailUrl ?? r.mediaUrl} alt="" w={160} h={200} className="h-20 w-16 shrink-0 rounded-xl" />}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2"><Avatar src={r.creator.avatarUrl} name={r.creator.displayName} size={24} /><span className="text-sm font-semibold">{r.creator.displayName}</span><span className="text-xs text-muted">@{r.creator.handle}</span></span>
                        <span className="mt-1 line-clamp-2 block text-sm text-muted">“{r.caption}”</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {p.similar.length > 0 && (
        <section className="mt-24">
          <SectionHeader title="You might also like" eyebrow="Related products" />
          <ProductGrid products={p.similar.slice(0, 4)} />
        </section>
      )}
    </div>
  );
}
