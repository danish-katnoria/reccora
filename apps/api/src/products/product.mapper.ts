import { LinkStatus, Prisma } from '@prisma/client';

export const productInclude = {
  images: { orderBy: { position: 'asc' } },
  brand: { select: { id: true, name: true, slug: true, logoUrl: true } },
  category: { select: { id: true, name: true, slug: true } },
  links: { where: { status: LinkStatus.APPROVED }, select: { id: true } },
} satisfies Prisma.ProductInclude;

export type ProductWithRelations = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

/** Public product shape. The merchant URL is never exposed; purchases go through GET /go/:productId. */
export function toProductDto(p: ProductWithRelations, savedIds?: Set<string>) {
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    description: p.description,
    price: Number(p.price),
    currency: p.currency,
    merchantName: p.merchantName,
    brand: p.brand,
    category: p.category,
    images: p.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt })),
    imageUrl: p.images[0]?.url ?? null,
    purchasable: p.links.length > 0,
    saveCount: p.saveCount,
    ...(savedIds ? { isSaved: savedIds.has(p.id) } : {}),
  };
}
