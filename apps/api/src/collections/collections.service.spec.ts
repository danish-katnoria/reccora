import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { createPrismaMock } from '../../test/prisma-mock';
import { CollectionsService } from './collections.service';

describe('CollectionsService', () => {
  let prisma: any;
  let svc: CollectionsService;
  const creators = { requireApproved: jest.fn().mockResolvedValue({ id: 'cr1' }), requireOwn: jest.fn() };

  beforeEach(() => {
    prisma = createPrismaMock();
    svc = new CollectionsService(prisma, creators as any);
    prisma.collection.findUnique.mockResolvedValue({ id: 'col1', creatorId: 'cr1', creator: { userId: 'u1' } });
  });

  it('creates a collection with a slug and rejects duplicates for the same creator', async () => {
    prisma.collection.findUnique.mockResolvedValueOnce(null);
    await svc.create('u1', { title: 'Summer Picks!' });
    expect(prisma.collection.create.mock.calls[0][0].data).toMatchObject({ creatorId: 'cr1', slug: 'summer-picks' });
    prisma.collection.findUnique.mockResolvedValueOnce({ id: 'dup' });
    await expect(svc.create('u1', { title: 'Summer Picks!' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('only the owner can modify a collection', async () => {
    await expect(svc.update('intruder', 'col1', { title: 'x' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.remove('intruder', 'col1')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.addProduct('intruder', 'col1', 'p1')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.removeProduct('intruder', 'col1', 'p1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.collection.update).not.toHaveBeenCalled();
    expect(prisma.collection.delete).not.toHaveBeenCalled();
  });

  it('adds only active products and mirrors them onto the storefront', async () => {
    prisma.product.findFirst.mockResolvedValue(null);
    await expect(svc.addProduct('u1', 'col1', 'p1')).rejects.toBeInstanceOf(NotFoundException);
    prisma.product.findFirst.mockResolvedValue({ id: 'p1' });
    prisma.collectionProduct.count.mockResolvedValue(2);
    await svc.addProduct('u1', 'col1', 'p1');
    expect(prisma.collectionProduct.upsert.mock.calls[0][0].create).toEqual({ collectionId: 'col1', productId: 'p1', position: 2 });
    expect(prisma.storefrontProduct.upsert).toHaveBeenCalled();
  });

  it('hides private collections from other viewers', async () => {
    prisma.collection.findFirst.mockResolvedValue({ id: 'col1', isPublic: false, creator: { userId: 'u1' }, products: [], _count: { products: 0 }, saveCount: 0, title: 't', slug: 's', coverUrl: null, description: null });
    await expect(svc.detail('col1', 'someoneElse')).rejects.toBeInstanceOf(NotFoundException);
  });
});
