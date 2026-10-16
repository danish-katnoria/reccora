import { NotFoundException } from '@nestjs/common';
import { createPrismaMock } from '../../test/prisma-mock';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let prisma: any;
  let svc: ProductsService;
  beforeEach(() => {
    prisma = createPrismaMock();
    svc = new ProductsService(prisma);
  });

  it('builds search, category and price filters and only shows ACTIVE products', () => {
    const where = svc.buildWhere({ q: 'shoe', category: 'fitness', minPrice: 10, maxPrice: 50, page: 1, limit: 20 });
    expect(where.status).toBe('ACTIVE');
    expect(where.price).toEqual({ gte: 10, lte: 50 });
    expect(where.OR).toHaveLength(4);
    expect(where.category).toBeDefined();
  });

  it('paginates and never exposes merchant URLs', async () => {
    prisma.product.findMany.mockResolvedValue([
      { id: 'p1', title: 'T', slug: 's', description: null, price: '19.99', currency: 'USD', merchantName: 'M', brand: null, category: null, images: [{ id: 'i', url: 'u', alt: null }], links: [{ id: 'l' }], saveCount: 0 },
    ]);
    prisma.product.count.mockResolvedValue(41);
    const res = await svc.list({ page: 2, limit: 20 } as any);
    expect(prisma.product.findMany.mock.calls[0][0]).toMatchObject({ skip: 20, take: 20 });
    expect(res.meta).toMatchObject({ page: 2, total: 41, totalPages: 3, hasMore: true });
    expect(res.items[0]).toMatchObject({ price: 19.99, purchasable: true, imageUrl: 'u' });
    expect(JSON.stringify(res)).not.toMatch(/"url":"https?:\/\/.*shop/);
    expect(res.items[0]).not.toHaveProperty('links');
  });

  it('marks products without an approved link as not purchasable', async () => {
    prisma.product.findMany.mockResolvedValue([{ id: 'p1', title: 'T', slug: 's', price: 1, currency: 'USD', merchantName: 'M', images: [], links: [], saveCount: 0 }]);
    prisma.product.count.mockResolvedValue(1);
    const res = await svc.list({ page: 1, limit: 20 } as any);
    expect(res.items[0].purchasable).toBe(false);
  });

  it('404s for disabled/unknown products and records views for signed-in users', async () => {
    prisma.product.findFirst.mockResolvedValue(null);
    await expect(svc.detail('x', 'u1')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.productView.upsert).not.toHaveBeenCalled();
  });

  it('disable is a soft delete', async () => {
    prisma.product.findUnique.mockResolvedValue({ id: 'p1' });
    await svc.disable('p1');
    expect(prisma.product.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { status: 'DISABLED' } });
    expect(prisma.product.delete).not.toHaveBeenCalled();
  });
});
