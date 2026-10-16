import { ConversionStatus } from '@prisma/client';
import { createPrismaMock } from '../../test/prisma-mock';
import { CommissionsService } from './commissions.service';

describe('CommissionsService.recordConversion', () => {
  let prisma: any;
  let svc: CommissionsService;
  const event = (o: Partial<any> = {}) => ({ provider: 'generic', externalId: 'o-1', attributionRef: 'rc_abc', status: ConversionStatus.CONFIRMED, orderAmount: 200, currency: 'USD', occurredAt: new Date(), raw: {}, ...o });

  beforeEach(() => {
    prisma = createPrismaMock();
    svc = new CommissionsService(prisma, { create: jest.fn() } as any, { conversionTrackingConfigured: true } as any);
    prisma.productClick.findUnique.mockResolvedValue({ id: 'click1', creatorId: 'creator1', product: { brandId: null, categoryId: null } });
    prisma.affiliateConversion.findUnique.mockResolvedValue(null);
    prisma.affiliateConversion.create.mockImplementation(async ({ data }: any) => ({ id: 'conv1', ...data, commission: null }));
    prisma.commissionRule.findMany.mockResolvedValue([{ id: 'r1', scope: 'DEFAULT', rate: 0.1, isActive: true }]);
  });

  it('creates a PENDING commission only for a confirmed, attributed conversion', async () => {
    await svc.recordConversion(event());
    expect(prisma.commissionRecord.create).toHaveBeenCalledWith({ data: expect.objectContaining({ creatorId: 'creator1', amount: 20, status: 'PENDING', ruleId: 'r1' }) });
  });

  it('does not create a commission for a pending conversion', async () => {
    await svc.recordConversion(event({ status: ConversionStatus.PENDING }));
    expect(prisma.affiliateConversion.create).toHaveBeenCalled();
    expect(prisma.commissionRecord.create).not.toHaveBeenCalled();
  });

  it('does not create a commission when no click attribution matches', async () => {
    prisma.productClick.findUnique.mockResolvedValue(null);
    await svc.recordConversion(event());
    expect(prisma.commissionRecord.create).not.toHaveBeenCalled();
  });

  it('does not create a commission when no rule is configured', async () => {
    prisma.commissionRule.findMany.mockResolvedValue([]);
    await svc.recordConversion(event());
    expect(prisma.commissionRecord.create).not.toHaveBeenCalled();
  });

  it('is idempotent: an existing commission is not duplicated', async () => {
    prisma.affiliateConversion.findUnique.mockResolvedValue({ id: 'conv1', status: 'CONFIRMED', commission: { id: 'c1', status: 'PENDING' }, merchantReference: null });
    prisma.affiliateConversion.update.mockResolvedValue({ id: 'conv1', creatorId: 'creator1', currency: 'USD', orderAmount: 200, commission: { id: 'c1', status: 'PENDING' } });
    await svc.recordConversion(event());
    expect(prisma.commissionRecord.create).not.toHaveBeenCalled();
  });

  it('does not downgrade a confirmed conversion on a late pending event', async () => {
    prisma.affiliateConversion.findUnique.mockResolvedValue({ id: 'conv1', status: 'CONFIRMED', commission: { id: 'c1', status: 'PENDING' }, merchantReference: null });
    prisma.affiliateConversion.update.mockResolvedValue({ id: 'conv1', creatorId: 'creator1', commission: { id: 'c1', status: 'PENDING' } });
    await svc.recordConversion(event({ status: ConversionStatus.PENDING }));
    expect(prisma.affiliateConversion.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'CONFIRMED' }) }));
  });

  it('voids an unpaid commission when the conversion is reversed', async () => {
    prisma.affiliateConversion.findUnique.mockResolvedValue({ id: 'conv1', status: 'CONFIRMED', commission: { id: 'c1', status: 'APPROVED' }, merchantReference: null });
    prisma.affiliateConversion.update.mockResolvedValue({ id: 'conv1', creatorId: 'creator1', commission: { id: 'c1', status: 'APPROVED' } });
    await svc.recordConversion(event({ status: ConversionStatus.REVERSED }));
    expect(prisma.commissionRecord.update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { status: 'VOID', payoutId: null } });
  });

  it('never voids an already paid commission automatically', async () => {
    prisma.affiliateConversion.findUnique.mockResolvedValue({ id: 'conv1', status: 'CONFIRMED', commission: { id: 'c1', status: 'PAID' }, merchantReference: null });
    prisma.affiliateConversion.update.mockResolvedValue({ id: 'conv1', creatorId: 'creator1', commission: { id: 'c1', status: 'PAID' } });
    await svc.recordConversion(event({ status: ConversionStatus.REVERSED }));
    expect(prisma.commissionRecord.update).not.toHaveBeenCalled();
  });
});

describe('CommissionsService payouts', () => {
  it('only bundles APPROVED commissions and moves no money', async () => {
    const prisma = createPrismaMock();
    const svc = new CommissionsService(prisma, { create: jest.fn() } as any, { conversionTrackingConfigured: true } as any);
    prisma.commissionRecord.findMany.mockResolvedValue([{ id: 'a', amount: 10.1 }, { id: 'b', amount: 5.2 }]);
    prisma.payout.create.mockResolvedValue({ id: 'p1' });
    await svc.createPayout('admin1', { creatorId: 'cr1' });
    expect(prisma.commissionRecord.findMany).toHaveBeenCalledWith({ where: expect.objectContaining({ status: 'APPROVED', payoutId: null }) });
    expect(prisma.payout.create).toHaveBeenCalledWith({ data: expect.objectContaining({ amount: 15.3, status: 'DRAFT' }) });
  });

  it('rejects payout when nothing is approved', async () => {
    const prisma = createPrismaMock();
    const svc = new CommissionsService(prisma, { create: jest.fn() } as any, { conversionTrackingConfigured: true } as any);
    prisma.commissionRecord.findMany.mockResolvedValue([]);
    await expect(svc.createPayout('admin1', { creatorId: 'cr1' })).rejects.toThrow('No approved commissions');
  });

  it('only approves PENDING commissions with a confirmed conversion', async () => {
    const prisma = createPrismaMock();
    const svc = new CommissionsService(prisma, { create: jest.fn() } as any, { conversionTrackingConfigured: true } as any);
    prisma.commissionRecord.findUnique.mockResolvedValue({ id: 'c', status: 'PAID', conversion: { status: 'CONFIRMED' } });
    await expect(svc.approveCommission('c')).rejects.toThrow('Only PENDING');
    prisma.commissionRecord.findUnique.mockResolvedValue({ id: 'c', status: 'PENDING', conversion: { status: 'REVERSED' } });
    await expect(svc.approveCommission('c')).rejects.toThrow('not confirmed');
  });
});
