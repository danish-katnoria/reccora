import Link from 'next/link';
import { compact, money, timeAgo } from '@/lib/format';
import type { CollectionSummary, CreatorSummary, FeedPost, Product } from '@/lib/types';
import { FollowButton } from './follow-button';
import { Avatar, Img } from './img';
import { SaveButton } from './save-button';

export function ProductCard({ product, creatorHandle, priority }: { product: Product; creatorHandle?: string; priority?: boolean }) {
  const href = `/product/${product.id}${creatorHandle ? `?creator=${creatorHandle}` : ''}`;
  return (
    <article className="group relative">
      <Link href={href} className="block" aria-label={product.title}>
        <div className="relative overflow-hidden rounded-3xl bg-sand shadow-card transition duration-300 group-hover:shadow-lift">
          <Img src={product.imageUrl} alt={product.title} w={640} h={800} priority={priority} className="aspect-[4/5] w-full transition duration-500 group-hover:scale-[1.04]" />
          {product.category && <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide backdrop-blur">{product.category.name}</span>}
        </div>
        <div className="mt-3 px-1">
          <h3 className="line-clamp-2 text-[15px] font-medium leading-snug">{product.title}</h3>
          <p className="mt-0.5 flex items-center justify-between gap-2 text-sm"><span className="font-semibold text-accent">{money(product.price, product.currency)}</span><span className="truncate text-muted">{product.merchantName}</span></p>
        </div>
      </Link>
      <div className="absolute right-3 top-3"><SaveButton productId={product.id} /></div>
    </article>
  );
}

export function ProductGrid({ products, creatorHandle, className = '' }: { products: Product[]; creatorHandle?: string; className?: string }) {
  return (
    <div className={`grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 lg:grid-cols-4 ${className}`}>
      {products.map((p, i) => <ProductCard key={p.id} product={p} creatorHandle={creatorHandle} priority={i < 4} />)}
    </div>
  );
}

export function CreatorCard({ creator }: { creator: CreatorSummary }) {
  return (
    <article className="group relative overflow-hidden rounded-3xl border border-line bg-surface shadow-card transition hover:shadow-lift">
      <Link href={`/c/${creator.handle}`} className="block" aria-label={`${creator.displayName}'s storefront`}>
        <div className="relative h-28 overflow-hidden bg-sand">
          <Img src={creator.coverUrl ?? creator.avatarUrl} alt="" w={640} h={256} className="h-full w-full transition duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>
        <div className="px-5 pb-5">
          <div className="relative z-10 -mt-9 mb-3"><Avatar src={creator.avatarUrl} name={creator.displayName} size={72} className="border-4 border-surface" /></div>
          <h3 className="font-display text-lg leading-tight">{creator.displayName}</h3>
          <p className="text-sm text-muted">@{creator.handle}{creator.followerCount !== undefined && ` · ${compact(creator.followerCount)} followers`}</p>
          {creator.bio && <p className="mt-2 line-clamp-2 text-sm text-muted">{creator.bio}</p>}
        </div>
      </Link>
      <div className="px-5 pb-5"><FollowButton handle={creator.handle} size="sm" /></div>
    </article>
  );
}

export function CollectionCard({ collection, tall = false }: { collection: Pick<CollectionSummary, 'id' | 'title' | 'coverUrl' | 'productCount'> & { creator?: CollectionSummary['creator'] }; tall?: boolean }) {
  return (
    <Link href={`/collection/${collection.id}`} className="group relative block overflow-hidden rounded-3xl bg-ink shadow-card transition hover:shadow-lift" aria-label={collection.title}>
      <Img src={collection.coverUrl} alt="" w={900} h={tall ? 1100 : 640} className={`w-full opacity-95 transition duration-700 group-hover:scale-105 ${tall ? 'aspect-[4/5]' : 'aspect-[16/10]'}`} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5 text-white">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">{collection.productCount} products{collection.creator ? ` · @${collection.creator.handle}` : ''}</p>
        <h3 className="font-display mt-1 text-2xl leading-tight">{collection.title}</h3>
      </div>
    </Link>
  );
}

/** Editorial recommendation card: creator photo post with the featured product(s) attached. */
export function PostCard({ post }: { post: FeedPost }) {
  const p = post.products[0];
  return (
    <article className="overflow-hidden rounded-3xl border border-line bg-surface shadow-card transition hover:shadow-lift">
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href={`/c/${post.creator.handle}`} className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar src={post.creator.avatarUrl} name={post.creator.displayName} size={36} />
          <span className="min-w-0"><span className="block truncate text-sm font-semibold">{post.creator.displayName}</span><span className="block text-xs text-muted">{timeAgo(post.publishedAt)}</span></span>
        </Link>
      </div>
      <Link href={`/post/${post.id}`} className="block"><Img src={post.thumbnailUrl ?? post.mediaUrl} alt={post.caption.slice(0, 80)} w={720} h={900} className="aspect-[4/5] w-full" /></Link>
      <div className="p-4">
        <p className="line-clamp-2 text-sm">{post.caption}</p>
        {p && (
          <Link href={`/product/${p.id}?creator=${post.creator.handle}&post=${post.id}`} className="mt-3 flex items-center gap-3 rounded-2xl bg-sand p-2 pr-4 transition hover:bg-line">
            <Img src={p.imageUrl} alt={p.title} w={120} h={120} className="h-14 w-14 shrink-0 rounded-xl" />
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{p.title}</span><span className="block text-sm font-semibold text-accent">{money(p.price, p.currency)}</span></span>
            <span className="text-xs font-semibold text-muted">View →</span>
          </Link>
        )}
      </div>
    </article>
  );
}
