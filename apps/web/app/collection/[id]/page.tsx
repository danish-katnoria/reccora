import type { Metadata } from 'next';
import Link from 'next/link';
import { ProductGrid } from '@/components/cards';
import { Avatar, Img } from '@/components/img';
import { ShareButton } from '@/components/share-button';
import { EmptyState } from '@/components/states';
import { sget } from '@/lib/server-api';
import type { CollectionDetail } from '@/lib/types';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const c = await sget<CollectionDetail>(`/collections/${id}`);
    return { title: c.title, description: c.description ?? undefined, openGraph: { title: c.title, images: c.coverUrl ? [c.coverUrl] : undefined } };
  } catch { return { title: 'Collection' }; }
}

export default async function CollectionPage({ params }: Props) {
  const { id } = await params;
  const c = await sget<CollectionDetail>(`/collections/${id}`);
  return (
    <div>
      <section className="relative isolate overflow-hidden bg-ink">
        <Img src={c.coverUrl} alt="" w={1800} h={800} priority className="absolute inset-0 -z-10 h-full w-full opacity-70" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
        <div className="mx-auto flex min-h-[380px] max-w-7xl flex-col justify-end px-4 pb-12 pt-24 text-white sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">Collection · {c.products.length} products</p>
          <h1 className="font-display mt-2 max-w-3xl text-5xl leading-tight sm:text-6xl">{c.title}</h1>
          {c.description && <p className="mt-3 max-w-xl text-lg text-white/85">{c.description}</p>}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link href={`/c/${c.creator.handle}`} className="flex items-center gap-3 rounded-full bg-white/15 py-1.5 pl-1.5 pr-5 backdrop-blur hover:bg-white/25"><Avatar src={c.creator.avatarUrl} name={c.creator.displayName} size={36} /><span className="text-sm font-semibold">Curated by {c.creator.displayName}</span></Link>
            <ShareButton title={c.title} />
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        {c.products.length ? <ProductGrid products={c.products} creatorHandle={c.creator.handle} /> : <EmptyState title="This collection is empty" body="Check back soon." action={{ href: '/explore', label: 'Explore products' }} />}
      </div>
    </div>
  );
}
