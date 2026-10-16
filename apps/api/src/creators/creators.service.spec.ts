import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { createPrismaMock } from '../../test/prisma-mock';
import { CreatorsService } from './creators.service';

describe('CreatorsService', () => {
  let prisma: any;
  let svc: CreatorsService;
  const creatorRow = { id: 'cr1', handle: 'maya', bio: 'hi', avatarUrl: null, coverUrl: null, followerCount: 3, status: 'APPROVED', user: { displayName: 'Maya' } };

  beforeEach(() => {
    prisma = createPrismaMock();
    svc = new CreatorsService(prisma, { get: () => ({ publicWebUrl: 'https://reccora.test/' }) } as any);
  });

  it('only exposes approved creators with active accounts', async () => {
    prisma.creatorProfile.findFirst.mockResolvedValue(null);
    await expect(svc.getProfile('ghost')).rejects.toBeInstanceOf(NotFoundException);
    const where = prisma.creatorProfile.findFirst.mock.calls[0][0].where;
    expect(where).toMatchObject({ status: 'APPROVED', user: { status: 'ACTIVE' } });
  });

  it('returns a shareable storefront URL', async () => {
    prisma.creatorProfile.findFirst.mockResolvedValue(creatorRow);
    const p = await svc.getProfile('Maya');
    expect(p.storefrontUrl).toBe('https://reccora.test/c/maya');
    expect(prisma.creatorProfile.findFirst.mock.calls[0][0].where.handle).toBe('maya');
  });

  it('records a storefront visit for shoppers but not for the owner', async () => {
    prisma.creatorProfile.findFirst.mockResolvedValueOnce(creatorRow); // findPublicByHandle
    prisma.creatorProfile.findFirst.mockResolvedValueOnce(null); // owner check -> not owner
    prisma.storefrontProduct.findMany.mockResolvedValue([]);
    prisma.post.findMany.mockResolvedValue([]);
    prisma.collection.findMany.mockResolvedValue([]);
    prisma.follow.findMany.mockResolvedValue([]);
    prisma.savedProduct.findMany.mockResolvedValue([]);
    await svc.storefront('maya', 'viewer1');
    expect(prisma.storefrontVisit.create).toHaveBeenCalledWith({ data: { creatorId: 'cr1', userId: 'viewer1' } });

    prisma.storefrontVisit.create.mockClear();
    prisma.creatorProfile.findFirst.mockResolvedValueOnce(creatorRow);
    prisma.creatorProfile.findFirst.mockResolvedValueOnce({ id: 'cr1' }); // is owner
    await svc.storefront('maya', 'ownerUser');
    expect(prisma.storefrontVisit.create).not.toHaveBeenCalled();
  });

  it('requires an approved creator account to curate products', async () => {
    prisma.creatorProfile.findUnique.mockResolvedValue({ id: 'cr1', status: 'SUSPENDED' });
    await expect(svc.addStorefrontProduct('u1', 'p1')).rejects.toBeInstanceOf(ForbiddenException);
    prisma.creatorProfile.findUnique.mockResolvedValue(null);
    await expect(svc.requireOwn('u1')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
