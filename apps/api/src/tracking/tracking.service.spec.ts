import { NotFoundException } from '@nestjs/common';
import { createPrismaMock } from '../../test/prisma-mock';
import { TrackingService } from './tracking.service';

describe('TrackingService.recordClick', () => {
  let prisma: any;
  let svc: TrackingService;
  const provider = { decorateUrl: jest.fn((u: string, ref: string) => `${u}?subid=${ref}`) };
  const registry = { get: jest.fn((name?: string) => (name === 'generic' ? provider : undefined)) };
  const config = { get: () => ({ tracking: { ipHashSalt: 's' } }) };

  beforeEach(() => {
    prisma = createPrismaMock();
    svc = new TrackingService(prisma, registry as any, {} as any, {} as any, config as any);
    prisma.productClick.create.mockResolvedValue({});
  });

  it('records a click and returns the approved merchant URL', async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 'p1', links: [{ id: 'l1', url: 'https://shop.test/x', affiliateProvider: null }] });
    const res = await svc.recordClick('p1', { ip: '1.2.3.4', userAgent: 'jest' });
    expect(res.redirectUrl).toBe('https://shop.test/x');
    expect(res.attributionRef).toMatch(/^rc_[0-9a-f]{24}$/);
    const data = prisma.productClick.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ productId: 'p1', linkId: 'l1', attributionRef: res.attributionRef, creatorId: null });
    expect(data.ipHash).toHaveLength(64); // raw IP is never stored
    expect(JSON.stringify(data)).not.toContain('1.2.3.4');
  });

  it('only queries APPROVED links of ACTIVE products', async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 'p1', links: [{ id: 'l1', url: 'https://shop.test/x' }] });
    await svc.recordClick('p1', {});
    const q = prisma.product.findFirst.mock.calls[0][0];
    expect(q.where.status).toBe('ACTIVE');
    expect(q.select.links.where.status).toBe('APPROVED');
  });

  it('appends attribution through the affiliate provider when configured', async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 'p1', links: [{ id: 'l1', url: 'https://shop.test/x', affiliateProvider: 'generic' }] });
    const res = await svc.recordClick('p1', {});
    expect(res.redirectUrl).toBe(`https://shop.test/x?subid=${res.attributionRef}`);
  });

  it('rejects unavailable products and records nothing', async () => {
    prisma.product.findFirst.mockResolvedValue(null);
    await expect(svc.recordClick('nope', {})).rejects.toBeInstanceOf(NotFoundException);
    prisma.product.findFirst.mockResolvedValue({ id: 'p1', links: [] });
    await expect(svc.recordClick('p1', {})).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.productClick.create).not.toHaveBeenCalled();
  });

  it('refuses non-http merchant URLs', async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 'p1', links: [{ id: 'l1', url: 'javascript:alert(1)' }] });
    await expect(svc.recordClick('p1', {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it('credits a creator only when they feature the product', async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 'p1', links: [{ id: 'l1', url: 'https://shop.test/x' }] });
    prisma.creatorProfile.findFirst.mockResolvedValue({ id: 'c1' });
    await svc.recordClick('p1', { creatorHandle: 'Maya' });
    expect(prisma.creatorProfile.findFirst.mock.calls[0][0].where).toMatchObject({ handle: 'maya', status: 'APPROVED', storefrontProducts: { some: { productId: 'p1' } } });
    expect(prisma.productClick.create.mock.calls[0][0].data.creatorId).toBe('c1');

    prisma.creatorProfile.findFirst.mockResolvedValue(null);
    await svc.recordClick('p1', { creatorHandle: 'stranger' });
    expect(prisma.productClick.create.mock.calls[1][0].data.creatorId).toBeNull();
  });

  it('never creates conversions or commissions from a click', async () => {
    prisma.product.findFirst.mockResolvedValue({ id: 'p1', links: [{ id: 'l1', url: 'https://shop.test/x' }] });
    await svc.recordClick('p1', {});
    expect(prisma.affiliateConversion.create).not.toHaveBeenCalled();
    expect(prisma.commissionRecord.create).not.toHaveBeenCalled();
  });
});

describe('TrackingService.creatorAnalytics', () => {
  it('reports conversions as pending integration when no provider is configured', async () => {
    const prisma = createPrismaMock();
    const creators = { requireOwn: jest.fn().mockResolvedValue({ id: 'c1' }) };
    const commissions = { conversionTrackingConfigured: false, creatorSummary: jest.fn().mockResolvedValue({ pending: [], approved: [], payable: [], paid: [] }) };
    const svc = new TrackingService(prisma, {} as any, creators as any, commissions as any, { get: () => ({ tracking: { ipHashSalt: 's' } }) } as any);
    prisma.storefrontVisit.count.mockResolvedValue(5);
    prisma.productClick.count.mockResolvedValue(3);
    prisma.productClick.groupBy.mockResolvedValue([]);
    prisma.post.findMany.mockResolvedValue([]);
    prisma.creatorProfile.findUniqueOrThrow.mockResolvedValue({ followerCount: 7 });
    prisma.affiliateConversion.count.mockResolvedValue(0);
    prisma.product.findMany.mockResolvedValue([]);
    const res = await svc.creatorAnalytics('u1', 30);
    expect(res.productClicks).toBe(3);
    expect(res.storefrontVisits).toBe(5);
    expect(res.conversions).toMatchObject({ status: 'pending_integration', confirmed: null, estimated: null });
    expect(res.commissions).toBeNull();
  });
});
