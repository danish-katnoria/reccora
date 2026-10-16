import { Prisma } from '@prisma/client';
import { productInclude, toProductDto } from '../products/product.mapper';

export const postInclude = {
  creator: { select: { id: true, handle: true, avatarUrl: true, followerCount: true, user: { select: { displayName: true } } } },
  products: { orderBy: { position: 'asc' }, where: { product: { status: 'ACTIVE' } }, include: { product: { include: productInclude } } },
} satisfies Prisma.PostInclude;

export type PostWithRelations = Prisma.PostGetPayload<{ include: typeof postInclude }>;

export function toPostDto(p: PostWithRelations, ctx?: { saved?: Set<string>; following?: Set<string> }) {
  return {
    id: p.id,
    caption: p.caption,
    mediaUrl: p.mediaUrl,
    mediaType: p.mediaType,
    thumbnailUrl: p.thumbnailUrl ?? (p.mediaType === 'IMAGE' ? p.mediaUrl : null),
    status: p.status,
    publishedAt: p.publishedAt,
    creator: {
      id: p.creator.id,
      handle: p.creator.handle,
      displayName: p.creator.user.displayName,
      avatarUrl: p.creator.avatarUrl,
      ...(ctx?.following ? { isFollowing: ctx.following.has(p.creator.id) } : {}),
    },
    products: p.products.map((pp) => toProductDto(pp.product, ctx?.saved)),
  };
}
