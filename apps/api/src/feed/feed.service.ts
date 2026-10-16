import { Injectable } from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { paginate, skipTake } from '../common/utils/pagination';
import { CollectionsService } from '../collections/collections.service';
import { CreatorsService, creatorSelect, publicCreatorWhere } from '../creators/creators.service';
import { PrismaService } from '../prisma/prisma.service';
import { postInclude, toPostDto } from '../posts/post.mapper';
import { productInclude, toProductDto } from '../products/product.mapper';
import { FeedQueryDto } from './feed.dto';

@Injectable()
export class FeedService {
  constructor(private prisma: PrismaService, private creators: CreatorsService, private collections: CollectionsService) {}

  async feed(q: FeedQueryDto, viewerId?: string) {
    const where: Prisma.PostWhereInput = {
      status: 'PUBLISHED',
      creator: { status: 'APPROVED', user: { status: 'ACTIVE' }, ...(q.scope === 'following' && viewerId ? { followers: { some: { followerId: viewerId } } } : {}) },
      products: { some: { product: { status: ProductStatus.ACTIVE, ...(q.category ? { category: { OR: [{ slug: q.category }, { parent: { slug: q.category } }] } } : {}) } } },
      ...(q.q ? { OR: [{ caption: { contains: q.q, mode: 'insensitive' } }, { products: { some: { product: { title: { contains: q.q, mode: 'insensitive' } } } } }] } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.post.findMany({ where, include: postInclude, orderBy: [{ publishedAt: 'desc' }, { id: 'asc' }], ...skipTake(q.page, q.limit) }),
      this.prisma.post.count({ where }),
    ]);
    const productIds = rows.flatMap((r) => r.products.map((p) => p.productId));
    const [savedRows, following] = await Promise.all([
      viewerId ? this.prisma.savedProduct.findMany({ where: { userId: viewerId, productId: { in: productIds } }, select: { productId: true } }) : [],
      this.creators.followingSet(viewerId, [...new Set(rows.map((r) => r.creatorId))]),
    ]);
    const saved = viewerId ? new Set(savedRows.map((s) => s.productId)) : undefined;
    return paginate(rows.map((r) => toPostDto(r, { saved, following })), total, q.page, q.limit);
  }

  /** Unified search across products, creators and collections. */
  async search(q: string, limit: number, viewerId?: string) {
    const term = q.trim();
    const [products, creators, collections] = await Promise.all([
      this.prisma.product.findMany({
        where: { status: ProductStatus.ACTIVE, OR: [{ title: { contains: term, mode: 'insensitive' } }, { merchantName: { contains: term, mode: 'insensitive' } }, { brand: { name: { contains: term, mode: 'insensitive' } } }] },
        include: productInclude, orderBy: { saveCount: 'desc' }, take: limit,
      }),
      this.prisma.creatorProfile.findMany({
        where: { ...publicCreatorWhere, OR: [{ handle: { contains: term, mode: 'insensitive' } }, { user: { displayName: { contains: term, mode: 'insensitive' } } }, { bio: { contains: term, mode: 'insensitive' } }] },
        select: creatorSelect, orderBy: { followerCount: 'desc' }, take: limit,
      }),
      this.collections.popularMatching(term, limit, viewerId),
    ]);
    const following = await this.creators.followingSet(viewerId, creators.map((c) => c.id));
    return {
      products: products.map((p) => toProductDto(p)),
      creators: creators.map((c) => this.creators.toDto(c, following?.has(c.id))),
      collections,
    };
  }
}
