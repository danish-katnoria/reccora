import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LinkStatus, Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paginate, skipTake } from '../common/utils/pagination';
import { uniqueSlug } from '../common/utils/slug';
import { AdminProductQueryDto, CreateProductDto, ProductLinkInput, ProductQueryDto, UpdateLinkDto, UpdateProductDto } from './dto/product.dto';
import { productInclude, toProductDto } from './product.mapper';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  buildWhere(q: ProductQueryDto, status?: ProductStatus): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = { status: status ?? ProductStatus.ACTIVE };
    if (q.q) {
      where.OR = [
        { title: { contains: q.q, mode: 'insensitive' } },
        { description: { contains: q.q, mode: 'insensitive' } },
        { merchantName: { contains: q.q, mode: 'insensitive' } },
        { brand: { name: { contains: q.q, mode: 'insensitive' } } },
      ];
    }
    if (q.category) where.category = { OR: [{ slug: q.category }, { parent: { slug: q.category } }] };
    if (q.minPrice !== undefined || q.maxPrice !== undefined) {
      where.price = { ...(q.minPrice !== undefined ? { gte: q.minPrice } : {}), ...(q.maxPrice !== undefined ? { lte: q.maxPrice } : {}) };
    }
    return where;
  }

  private orderBy(sort?: string): Prisma.ProductOrderByWithRelationInput[] {
    switch (sort) {
      case 'price_asc': return [{ price: 'asc' }, { id: 'asc' }];
      case 'price_desc': return [{ price: 'desc' }, { id: 'asc' }];
      case 'popular': return [{ saveCount: 'desc' }, { createdAt: 'desc' }];
      default: return [{ createdAt: 'desc' }, { id: 'asc' }];
    }
  }

  async list(q: ProductQueryDto, viewerId?: string) {
    const where = this.buildWhere(q);
    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({ where, include: productInclude, orderBy: this.orderBy(q.sort), ...skipTake(q.page, q.limit) }),
      this.prisma.product.count({ where }),
    ]);
    const saved = await this.savedSet(viewerId, rows.map((r) => r.id));
    return paginate(rows.map((r) => toProductDto(r, saved)), total, q.page, q.limit);
  }

  async savedSet(viewerId: string | undefined, productIds: string[]): Promise<Set<string> | undefined> {
    if (!viewerId) return undefined;
    const rows = await this.prisma.savedProduct.findMany({ where: { userId: viewerId, productId: { in: productIds } }, select: { productId: true } });
    return new Set(rows.map((r) => r.productId));
  }

  /** Public product detail with recommending creators and similar products. Records a "recently viewed" entry for signed-in users. */
  async detail(id: string, viewerId?: string) {
    const product = await this.prisma.product.findFirst({ where: { id, status: ProductStatus.ACTIVE }, include: productInclude });
    if (!product) throw new NotFoundException('Product not found');

    if (viewerId) {
      await this.prisma.productView.upsert({
        where: { userId_productId: { userId: viewerId, productId: id } },
        create: { userId: viewerId, productId: id },
        update: { viewedAt: new Date() },
      });
    }

    const [recommenders, similar, saved] = await Promise.all([
      this.recommenders(id),
      this.similar(product.id, product.categoryId, product.brandId),
      this.savedSet(viewerId, [id]),
    ]);
    return { ...toProductDto(product, saved), recommendedBy: recommenders, similar };
  }

  private async recommenders(productId: string) {
    const posts = await this.prisma.post.findMany({
      where: { status: 'PUBLISHED', products: { some: { productId } }, creator: { status: 'APPROVED', user: { status: 'ACTIVE' } } },
      orderBy: { publishedAt: 'desc' },
      take: 10,
      select: { id: true, caption: true, mediaUrl: true, thumbnailUrl: true, creator: { select: { id: true, handle: true, avatarUrl: true, user: { select: { displayName: true } } } } },
    });
    const seen = new Set<string>();
    return posts
      .filter((p) => (seen.has(p.creator.id) ? false : (seen.add(p.creator.id), true)))
      .map((p) => ({
        creator: { id: p.creator.id, handle: p.creator.handle, displayName: p.creator.user.displayName, avatarUrl: p.creator.avatarUrl },
        postId: p.id,
        caption: p.caption,
        mediaUrl: p.mediaUrl,
        thumbnailUrl: p.thumbnailUrl,
      }));
  }

  private async similar(productId: string, categoryId: string | null, brandId: string | null) {
    const or: Prisma.ProductWhereInput[] = [];
    if (categoryId) or.push({ categoryId });
    if (brandId) or.push({ brandId });
    if (or.length === 0) return [];
    const rows = await this.prisma.product.findMany({
      where: { status: ProductStatus.ACTIVE, id: { not: productId }, OR: or },
      include: productInclude,
      orderBy: [{ saveCount: 'desc' }, { createdAt: 'desc' }],
      take: 8,
    });
    return rows.map((r) => toProductDto(r));
  }

  // ---- admin operations (controller enforces ADMIN role) ----

  async adminList(q: AdminProductQueryDto) {
    const where = this.buildWhere(q, undefined);
    if (q.status) where.status = q.status;
    else delete where.status;
    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({ where, include: { ...productInclude, links: true }, orderBy: this.orderBy(q.sort), ...skipTake(q.page, q.limit) }),
      this.prisma.product.count({ where }),
    ]);
    return paginate(rows.map((r) => ({ ...toProductDto({ ...r, links: r.links.filter((l) => l.status === 'APPROVED') } as any), status: r.status, links: r.links })), total, q.page, q.limit);
  }

  async create(dto: CreateProductDto) {
    this.assertSingleDefaults(dto.links);
    const product = await this.prisma.product.create({
      data: {
        title: dto.title,
        slug: uniqueSlug(dto.title),
        description: dto.description,
        price: dto.price,
        currency: dto.currency ?? 'USD',
        merchantName: dto.merchantName,
        brandId: dto.brandId,
        categoryId: dto.categoryId,
        status: dto.status ?? ProductStatus.ACTIVE,
        images: { create: (dto.images ?? []).map((i, position) => ({ url: i.url, alt: i.alt, position })) },
        links: { create: (dto.links ?? []).map((l, idx) => this.linkData(l, idx === 0)) },
      },
      include: { ...productInclude, links: true },
    });
    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.ensureExists(id);
    const { images, ...rest } = dto;
    return this.prisma.$transaction(async (tx) => {
      if (images) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        await tx.productImage.createMany({ data: images.map((i, position) => ({ productId: id, url: i.url, alt: i.alt, position })) });
      }
      return tx.product.update({ where: { id }, data: rest, include: { ...productInclude, links: true } });
    });
  }

  /** Disabling is a soft delete: product disappears from public surfaces and links stop redirecting. */
  async disable(id: string) {
    await this.ensureExists(id);
    return this.prisma.product.update({ where: { id }, data: { status: ProductStatus.DISABLED } });
  }

  async addLink(productId: string, dto: ProductLinkInput) {
    await this.ensureExists(productId);
    return this.prisma.productLink.create({ data: { productId, ...this.linkData(dto, false) } });
  }

  async updateLink(linkId: string, dto: UpdateLinkDto) {
    const link = await this.prisma.productLink.findUnique({ where: { id: linkId } });
    if (!link) throw new NotFoundException('Link not found');
    return this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary) await tx.productLink.updateMany({ where: { productId: link.productId }, data: { isPrimary: false } });
      return tx.productLink.update({ where: { id: linkId }, data: dto });
    });
  }

  async removeLink(linkId: string) {
    await this.prisma.productLink.delete({ where: { id: linkId } });
    return { success: true };
  }

  private linkData(l: ProductLinkInput, defaultPrimary: boolean) {
    return {
      merchantName: l.merchantName,
      url: l.url,
      affiliateProvider: l.affiliateProvider,
      status: l.status ?? LinkStatus.APPROVED,
      isPrimary: l.isPrimary ?? defaultPrimary,
    };
  }

  private assertSingleDefaults(links?: ProductLinkInput[]) {
    if (links && links.filter((l) => l.isPrimary).length > 1) throw new BadRequestException('Only one primary link is allowed');
  }

  private async ensureExists(id: string) {
    const p = await this.prisma.product.findUnique({ where: { id }, select: { id: true } });
    if (!p) throw new NotFoundException('Product not found');
  }
}
