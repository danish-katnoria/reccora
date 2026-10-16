import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
import { paginate, skipTake } from '../common/utils/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { productInclude, toProductDto } from '../products/product.mapper';

@Injectable()
export class SavedService {
  constructor(private prisma: PrismaService) {}

  async saveProduct(userId: string, productId: string) {
    const p = await this.prisma.product.findFirst({ where: { id: productId, status: ProductStatus.ACTIVE }, select: { id: true } });
    if (!p) throw new NotFoundException('Product not found');
    const created = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.savedProduct.findUnique({ where: { userId_productId: { userId, productId } } });
      if (existing) return false;
      await tx.savedProduct.create({ data: { userId, productId } });
      await tx.product.update({ where: { id: productId }, data: { saveCount: { increment: 1 } } });
      return true;
    });
    return { isSaved: true, created };
  }

  async unsaveProduct(userId: string, productId: string) {
    await this.prisma.$transaction(async (tx) => {
      const res = await tx.savedProduct.deleteMany({ where: { userId, productId } });
      if (res.count > 0) await tx.product.update({ where: { id: productId }, data: { saveCount: { decrement: 1 } } });
    });
    return { isSaved: false };
  }

  async listProducts(userId: string, page: number, limit: number) {
    const where = { userId, product: { status: ProductStatus.ACTIVE } };
    const [rows, total] = await Promise.all([
      this.prisma.savedProduct.findMany({ where, orderBy: { createdAt: 'desc' }, ...skipTake(page, limit), include: { product: { include: productInclude } } }),
      this.prisma.savedProduct.count({ where }),
    ]);
    const saved = new Set(rows.map((r) => r.productId));
    return paginate(rows.map((r) => toProductDto(r.product, saved)), total, page, limit);
  }

  async recentlyViewed(userId: string, limit: number) {
    const rows = await this.prisma.productView.findMany({
      where: { userId, product: { status: ProductStatus.ACTIVE } },
      orderBy: { viewedAt: 'desc' },
      take: limit,
      include: { product: { include: productInclude } },
    });
    return rows.map((r) => toProductDto(r.product));
  }

  async saveCollection(userId: string, collectionId: string) {
    const c = await this.prisma.collection.findFirst({ where: { id: collectionId, isPublic: true, creator: { status: 'APPROVED' } }, select: { id: true } });
    if (!c) throw new NotFoundException('Collection not found');
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.savedCollection.findUnique({ where: { userId_collectionId: { userId, collectionId } } });
      if (existing) return;
      await tx.savedCollection.create({ data: { userId, collectionId } });
      await tx.collection.update({ where: { id: collectionId }, data: { saveCount: { increment: 1 } } });
    });
    return { isSaved: true };
  }

  async unsaveCollection(userId: string, collectionId: string) {
    await this.prisma.$transaction(async (tx) => {
      const res = await tx.savedCollection.deleteMany({ where: { userId, collectionId } });
      if (res.count > 0) await tx.collection.update({ where: { id: collectionId }, data: { saveCount: { decrement: 1 } } });
    });
    return { isSaved: false };
  }

  async listCollections(userId: string, page: number, limit: number) {
    const where = { userId, collection: { isPublic: true } };
    const [rows, total] = await Promise.all([
      this.prisma.savedCollection.findMany({
        where, orderBy: { createdAt: 'desc' }, ...skipTake(page, limit),
        select: { collection: { select: { id: true, title: true, slug: true, description: true, coverUrl: true, saveCount: true, _count: { select: { products: true } }, creator: { select: { handle: true, user: { select: { displayName: true } } } } } } },
      }),
      this.prisma.savedCollection.count({ where }),
    ]);
    return paginate(
      rows.map(({ collection: c }) => ({
        id: c.id, title: c.title, slug: c.slug, description: c.description, coverUrl: c.coverUrl, saveCount: c.saveCount,
        productCount: c._count.products, creator: { handle: c.creator.handle, displayName: c.creator.user.displayName }, isSaved: true,
      })),
      total, page, limit,
    );
  }
}
