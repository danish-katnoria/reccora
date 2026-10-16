import Link from 'next/link';
import { CollectionCard, CreatorCard, PostCard, ProductGrid } from '@/components/cards';
import { Avatar, Img } from '@/components/img';
import { SectionHeader } from '@/components/states';
import { sgetSafe } from '@/lib/server-api';
import type { Category, CollectionSummary, CreatorSummary, FeedPost, Paginated, Product } from '@/lib/types';

export const dynamic = 'force-dynamic';
const empty = <T,>(): Paginated<T> => ({ items: [], meta: { page: 1, limit: 0, total: 0, totalPages: 0, hasMore: false } });

export default async function Home() {
  const [categories, trending, fresh, creators, collections, posts] = await Promise.all([
    sgetSafe<Category[]>('/categories', []),
    sgetSafe<Paginated<Product>>('/products?sort=popular&limit=8', empty()),
    sgetSafe<Paginated<Product>>('/products?sort=newest&limit=8', empty()),
    sgetSafe<Paginated<CreatorSummary>>('/creators/trending?limit=6', empty()),
    sgetSafe<Paginated<CollectionSummary>>('/collections/popular?limit=5', empty()),
    sgetSafe<Paginated<FeedPost>>('/feed?limit=6', empty()),
  ]);
  // One representative photo per category, taken from real catalogue data.
  const tiles = await Promise.all(categories.map(async (c) => {
    const r = await sgetSafe<Paginated<Product>>(`/products?category=${c.slug}&sort=popular&limit=1`, empty());
    return { ...c, image: r.items[0]?.imageUrl ?? null, count: r.meta.total };
  }));
  const [lead, ...rest] = collections.items;
  const heroProducts = trending.items.slice(0, 3);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-sand to-bg">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:py-20">
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-accent">Creator-led shopping</p>
            <h1 className="font-display text-5xl leading-[1.04] sm:text-6xl lg:text-7xl">Discover what <em className="text-accent not-italic">creators</em> love.</h1>
            <p className="mt-6 max-w-lg text-lg text-muted">Shop the products real people recommend — then buy straight from the merchant. No checkout detours, just great taste.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/explore" className="rounded-full bg-accent px-7 py-3.5 text-sm font-semibold text-white shadow-lift hover:bg-accent-deep">Start exploring</Link>
              <Link href="/explore?tab=creators" className="rounded-full border border-ink/20 bg-surface px-7 py-3.5 text-sm font-semibold hover:border-ink">Meet the creators</Link>
            </div>
            {creators.items.length > 0 && (
              <div className="mt-10 flex items-center gap-3">
                <div className="flex -space-x-3">{creators.items.slice(0, 5).map((c) => <Avatar key={c.id} src={c.avatarUrl} name={c.displayName} size={40} className="border-2 border-bg" />)}</div>
                <p className="text-sm text-muted">Trusted picks from <strong className="text-ink">{creators.meta.total} creators</strong></p>
              </div>
            )}
          </div>
          <div className="relative mx-auto grid w-full max-w-xl grid-cols-2 gap-4" aria-hidden={heroProducts.length === 0}>
            {heroProducts.map((p, i) => (
              <Link key={p.id} href={`/product/${p.id}`} className={`group relative overflow-hidden rounded-[2rem] shadow-lift ${i === 0 ? 'row-span-2' : ''}`} tabIndex={-1}>
                <Img src={p.imageUrl} alt={p.title} w={700} h={i === 0 ? 1100 : 560} priority className={`w-full transition duration-700 group-hover:scale-105 ${i === 0 ? 'aspect-[3/4.4]' : 'aspect-[4/3]'}`} />
                <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold shadow-card">{p.title}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      {tiles.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6" aria-label="Shop by category">
          <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-6">
            {tiles.map((c) => (
              <Link key={c.id} href={`/explore?category=${c.slug}`} className="group relative block w-40 shrink-0 overflow-hidden rounded-3xl sm:w-auto">
                <Img src={c.image} alt={c.name} w={400} h={500} className="aspect-[4/5] w-full transition duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 text-white"><p className="font-display text-xl leading-tight">{c.name}</p><p className="text-xs text-white/75">{c.count} products</p></div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Trending products */}
      <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
        <SectionHeader eyebrow="Most saved" title="Trending products" href="/explore?sort=popular" />
        {trending.items.length ? <ProductGrid products={trending.items} /> : <p className="text-muted">No products yet.</p>}
      </section>

      {/* Collections */}
      {collections.items.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-24 sm:px-6">
          <SectionHeader eyebrow="Curated by creators" title="Collections worth browsing" />
          <div className="grid gap-5 md:grid-cols-3">
            {lead && <div className="md:row-span-2"><CollectionCard collection={lead} tall /></div>}
            {rest.slice(0, 4).map((c) => <CollectionCard key={c.id} collection={c} />)}
          </div>
        </section>
      )}

      {/* Featured creators */}
      {creators.items.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-24 sm:px-6">
          <SectionHeader eyebrow="Follow for more" title="Featured creators" href="/explore?tab=creators" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{creators.items.slice(0, 6).map((c) => <CreatorCard key={c.id} creator={c} />)}</div>
        </section>
      )}

      {/* Recommendations */}
      {posts.items.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-24 sm:px-6">
          <SectionHeader eyebrow="Fresh from creators" title="Recommended right now" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{posts.items.map((p) => <PostCard key={p.id} post={p} />)}</div>
        </section>
      )}

      {/* New in */}
      <section className="mx-auto max-w-7xl px-4 pt-24 sm:px-6">
        <SectionHeader eyebrow="Just added" title="New to Reccora" href="/explore?sort=newest" />
        {fresh.items.length > 0 && <ProductGrid products={fresh.items} />}
      </section>

      {/* Creator CTA */}
      <section className="mx-auto max-w-7xl px-4 pt-24 sm:px-6">
        <div className="relative overflow-hidden rounded-[2rem] bg-accent px-8 py-14 text-white sm:px-14">
          <div className="max-w-xl">
            <h2 className="font-display text-4xl leading-tight">Got great taste? Share it.</h2>
            <p className="mt-3 text-white/90">Create your storefront, recommend products you love and share a single link with your audience.</p>
            <Link href="/register?role=CREATOR" className="mt-7 inline-flex rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-accent hover:bg-accent-soft">Become a creator</Link>
          </div>
        </div>
      </section>
    </>
  );
}
