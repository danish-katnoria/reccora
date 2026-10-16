import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
import { paginate, skipTake } from '../common/utils/pagination';
import { slugify } from '../common/utils/slug';
import { CreatorsService } from '../creators/creators.service';
import { PrismaService } from '../prisma/prisma.service';
import { productInclude, toProductDto } from '../products/product.mapper';
import { CreateCollectionDto, UpdateCollectionDto } from './dto/collection.dto';

const summarySelect = {
  id: true, title: true, slug: true, description: true, coverUrl: true, saveCount: true, isPublic: true,
  _count: { select: { products: true } },
  creator: { select: { handle: true, avatarUrl: true, user: { select: { displayName: true } } } },
  products: { take: 1, orderBy: { position: 'asc' as const }, select: { product: { select: { images: { take: 1, orderBy: { position: 'asc' as const }, select: { url: true } } } } } },
};

@Injectable()
export class CollectionsService {
  constructor(private prisma: PrismaService, private creators: CreatorsService) {}

  private toSummary(c: any, savedIds?: Set<string>) {
    return {
      id: c.id, title: c.title, slug: c.slug, description: c.description, isPublic: c.isPublic, saveCount: c.saveCount,
      coverUrl: c.coverUrl ?? c.products[0]?.product.images[0]?.url ?? null,
      productCount: c._count.products,
      creator: { handle: c.creator.handle, displayName: c.creator.user.displayName, avatarUrl: c.creator.avatarUrl },
      ...(savedIds ? { isSaved: savedIds.has(c.id) } : {}),
    };
  }

  async savedSet(viewerId: string | undefined, ids: string[]) {
    if (!viewerId || ids.length === 0) return undefined;
    const rows = await this.prisma.savedCollection.findMany({ where: { userId: viewerId, collectionId: { in: ids } }, select: { collectionId: true } });
    return new Set(rows.map((r) => r.collectionId));
  }

  async popular(page: number, limit: number, viewerId?: string) {
    const where = { isPublic: true, creator: { status: 'APPROVED' as const, user: { status: 'ACTIVE' as const } }, products: { some: {} } };
    const [rows, total] = await Promise.all([
      this.prisma.collection.findMany({ where, orderBy: [{ saveCount: 'desc' }, { createdAt: 'desc' }], ...skipTake(page, limit), select: summarySelect }),
      this.prisma.collection.count({ where }),
    ]);
    const saved = await this.savedSet(viewerId, rows.map((r) => r.id));
    return paginate(rows.map((r) => this.toSummary(r, saved)), total, page, limit);
  }

  async popularMatching(term: string, limit: number, viewerId?: string) {
    const rows = await this.prisma.collection.findMany({
      where: { isPublic: true, creator: { status: 'APPROVED', user: { status: 'ACTIVE' } }, products: { some: {} }, OR: [{ title: { contains: term, mode: 'insensitive' } }, { description: { contains: term, mode: 'insensitive' } }] },
      orderBy: { saveCount: 'desc' }, take: limit, select: summarySelect,
    });
    const saved = await this.savedSet(viewerId, rows.map((r) => r.id));
    return rows.map((r) => this.toSummary(r, saved));
  }

  async detail(id: string, viewerId?: string) {
    const c = await this.prisma.collection.findFirst({
      where: { id, creator: { status: 'APPROVED', user: { status: 'ACTIVE' } } },
      select: { ...summarySelect, creator: { select: { id: true, userId: true, handle: true, avatarUrl: true, user: { select: { displayName: true } } } }, products: { orderBy: { position: 'asc' }, where: { product: { status: ProductStatus.ACTIVE } }, select: { product: { include: productInclude } } } },
    });
    if (!c) throw new NotFoundException('Collection not found');
    if (!c.isPublic && c.creator.userId !== viewerId) throw new NotFoundException('Collection not found');
    const saved = await this.savedSet(viewerId, [c.id]);
    const productSaved = await this.prisma.savedProduct.findMany({ where: { userId: viewerId ?? '', productId: { in: c.products.map((p) => p.product.id) } }, select: { productId: true } });
    const ps = viewerId ? new Set(productSaved.map((p) => p.productId)) : undefined;
    return { ...this.toSummary(c, saved), productCount: c.products.length, products: c.products.map((p) => toProductDto(p.product, ps)) };
  }

  async listOwn(userId: string) {
    const creator = await this.creators.requireOwn(userId);
    const rows = await this.prisma.collection.findMany({ where: { creatorId: creator.id }, orderBy: { createdAt: 'desc' }, select: summarySelect });
    return rows.map((r) => this.toSummary(r));
  }

  async create(userId: string, dto: CreateCollectionDto) {
    const creator = await this.creators.requireApproved(userId);
    const slug = slugify(dto.title);
    if (await this.prisma.collection.findUnique({ where: { creatorId_slug: { creatorId: creator.id, slug } } })) {
      throw new ConflictException('You already have a collection with this title');
    }
    return this.prisma.collection.create({ data: { creatorId: creator.id, title: dto.title, slug, description: dto.description, coverUrl: dto.coverUrl, isPublic: dto.isPublic ?? true } });
  }

  private async requireOwned(userId: string, id: string) {
    const c = await this.prisma.collection.findUnique({ where: { id }, include: { creator: { select: { userId: true } } } });
    if (!c) throw new NotFoundException('Collection not found');
    if (c.creator.userId !== userId) throw new ForbiddenException('You can only modify your own collections');
    return c;
  }

  async update(userId: string, id: string, dto: UpdateCollectionDto) {
    await this.requireOwned(userId, id);
    return this.prisma.collection.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string) {
    await this.requireOwned(userId, id);
    await this.prisma.collection.delete({ where: { id } });
    return { success: true };
  }

  async addProduct(userId: string, id: string, productId: string) {
    const c = await this.requireOwned(userId, id);
    const p = await this.prisma.product.findFirst({ where: { id: productId, status: ProductStatus.ACTIVE }, select: { id: true } });
    if (!p) throw new NotFoundException('Product not found');
    const count = await this.prisma.collectionProduct.count({ where: { collectionId: c.id } });
    await this.prisma.collectionProduct.upsert({
      where: { collectionId_productId: { collectionId: id, productId } },
      create: { collectionId: id, productId, position: count },
      update: {},
    });
    // Collections are curated from the creator's storefront.
    await this.prisma.storefrontProduct.upsert({
      where: { creatorId_productId: { creatorId: c.creatorId, productId } },
      create: { creatorId: c.creatorId, productId },
      update: {},
    });
    return { success: true };
  }

  async removeProduct(userId: string, id: string, productId: string) {
    await this.requireOwned(userId, id);
    await this.prisma.collectionProduct.deleteMany({ where: { collectionId: id, productId } });
    return { success: true };
  }
}
