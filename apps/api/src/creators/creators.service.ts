import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreatorStatus, ProductStatus, Prisma } from '@prisma/client';
import { AppConfig } from '../config/configuration';
import { paginate, skipTake } from '../common/utils/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { productInclude, toProductDto } from '../products/product.mapper';
import { UpdateCreatorDto } from './dto/creator.dto';

export const publicCreatorWhere: Prisma.CreatorProfileWhereInput = { status: CreatorStatus.APPROVED, user: { status: 'ACTIVE' } };

export const creatorSelect = {
  id: true, handle: true, bio: true, avatarUrl: true, coverUrl: true, followerCount: true, status: true,
  user: { select: { displayName: true } },
} satisfies Prisma.CreatorProfileSelect;

type CreatorRow = Prisma.CreatorProfileGetPayload<{ select: typeof creatorSelect }>;

@Injectable()
export class CreatorsService {
  private webUrl: string;

  constructor(private prisma: PrismaService, config: ConfigService) {
    this.webUrl = config.get<AppConfig>('app')!.publicWebUrl;
  }

  toDto(c: CreatorRow, isFollowing?: boolean) {
    return {
      id: c.id,
      handle: c.handle,
      displayName: c.user.displayName,
      bio: c.bio,
      avatarUrl: c.avatarUrl,
      coverUrl: c.coverUrl,
      followerCount: c.followerCount,
      storefrontUrl: `${this.webUrl.replace(/\/$/, '')}/c/${c.handle}`,
      ...(isFollowing !== undefined ? { isFollowing } : {}),
    };
  }

  async followingSet(viewerId: string | undefined, creatorIds: string[]) {
    if (!viewerId || creatorIds.length === 0) return undefined;
    const rows = await this.prisma.follow.findMany({ where: { followerId: viewerId, creatorId: { in: creatorIds } }, select: { creatorId: true } });
    return new Set(rows.map((r) => r.creatorId));
  }

  async trending(page: number, limit: number, viewerId?: string) {
    const [rows, total] = await Promise.all([
      this.prisma.creatorProfile.findMany({ where: publicCreatorWhere, select: creatorSelect, orderBy: [{ followerCount: 'desc' }, { createdAt: 'desc' }], ...skipTake(page, limit) }),
      this.prisma.creatorProfile.count({ where: publicCreatorWhere }),
    ]);
    const following = await this.followingSet(viewerId, rows.map((r) => r.id));
    return paginate(rows.map((r) => this.toDto(r, following?.has(r.id))), total, page, limit);
  }

  async findPublicByHandle(handle: string) {
    const c = await this.prisma.creatorProfile.findFirst({ where: { handle: handle.toLowerCase(), ...publicCreatorWhere }, select: creatorSelect });
    if (!c) throw new NotFoundException('Creator not found');
    return c;
  }

  async getProfile(handle: string, viewerId?: string) {
    const c = await this.findPublicByHandle(handle);
    const following = await this.followingSet(viewerId, [c.id]);
    return this.toDto(c, following ? following.has(c.id) : undefined);
  }

  /** Public storefront: profile, curated products, recommendation posts, collections. Records a visit (not for the owner). */
  async storefront(handle: string, viewerId?: string) {
    const c = await this.findPublicByHandle(handle);
    const owner = viewerId ? await this.prisma.creatorProfile.findFirst({ where: { id: c.id, userId: viewerId }, select: { id: true } }) : null;
    if (!owner) await this.prisma.storefrontVisit.create({ data: { creatorId: c.id, userId: viewerId } });

    const [products, posts, collections, following] = await Promise.all([
      this.prisma.storefrontProduct.findMany({
        where: { creatorId: c.id, product: { status: ProductStatus.ACTIVE } },
        orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
        take: 60,
        include: { product: { include: productInclude } },
      }),
      this.prisma.post.findMany({
        where: { creatorId: c.id, status: 'PUBLISHED' },
        orderBy: { publishedAt: 'desc' },
        take: 30,
        select: { id: true, caption: true, mediaUrl: true, mediaType: true, thumbnailUrl: true, publishedAt: true },
      }),
      this.prisma.collection.findMany({
        where: { creatorId: c.id, isPublic: true },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: { id: true, title: true, slug: true, description: true, coverUrl: true, saveCount: true, _count: { select: { products: true } }, products: { take: 1, orderBy: { position: 'asc' }, select: { product: { select: { images: { take: 1, orderBy: { position: 'asc' }, select: { url: true } } } } } } },
      }),
      this.followingSet(viewerId, [c.id]),
    ]);
    const saved = viewerId
      ? new Set((await this.prisma.savedProduct.findMany({ where: { userId: viewerId, productId: { in: products.map((p) => p.productId) } }, select: { productId: true } })).map((s) => s.productId))
      : undefined;

    return {
      creator: this.toDto(c, following ? following.has(c.id) : undefined),
      products: products.map((p) => toProductDto(p.product, saved)),
      posts,
      collections: collections.map(({ products: first, _count, ...col }) => ({
        ...col,
        productCount: _count.products,
        coverUrl: col.coverUrl ?? first[0]?.product.images[0]?.url ?? null,
      })),
    };
  }

  // ---- own profile management ----

  async requireOwn(userId: string) {
    const c = await this.prisma.creatorProfile.findUnique({ where: { userId } });
    if (!c) throw new ForbiddenException('Creator profile required');
    return c;
  }

  async requireApproved(userId: string) {
    const c = await this.requireOwn(userId);
    if (c.status !== CreatorStatus.APPROVED) throw new ForbiddenException('Creator account is not approved');
    return c;
  }

  async getOwn(userId: string) {
    const c = await this.requireOwn(userId);
    const full = await this.prisma.creatorProfile.findUniqueOrThrow({ where: { id: c.id }, select: { ...creatorSelect, status: true } });
    return { ...this.toDto(full), status: full.status };
  }

  async updateOwn(userId: string, dto: UpdateCreatorDto) {
    const c = await this.requireOwn(userId);
    if (dto.handle && dto.handle !== c.handle) {
      const taken = await this.prisma.creatorProfile.findUnique({ where: { handle: dto.handle } });
      if (taken) throw new ConflictException('Handle is already taken');
    }
    const { displayName, ...profile } = dto;
    await this.prisma.$transaction([
      this.prisma.creatorProfile.update({ where: { id: c.id }, data: profile }),
      ...(displayName || dto.avatarUrl ? [this.prisma.user.update({ where: { id: userId }, data: { displayName, avatarUrl: dto.avatarUrl } })] : []),
    ]);
    return this.getOwn(userId);
  }

  async addStorefrontProduct(userId: string, productId: string) {
    const c = await this.requireApproved(userId);
    const p = await this.prisma.product.findFirst({ where: { id: productId, status: ProductStatus.ACTIVE }, select: { id: true } });
    if (!p) throw new NotFoundException('Product not found');
    await this.prisma.storefrontProduct.upsert({
      where: { creatorId_productId: { creatorId: c.id, productId } },
      create: { creatorId: c.id, productId },
      update: {},
    });
    return { success: true };
  }

  async removeStorefrontProduct(userId: string, productId: string) {
    const c = await this.requireOwn(userId);
    await this.prisma.storefrontProduct.deleteMany({ where: { creatorId: c.id, productId } });
    return { success: true };
  }
}
