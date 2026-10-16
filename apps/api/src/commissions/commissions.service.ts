import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CommissionStatus, ConversionStatus, NotificationType, PayoutStatus, Prisma } from '@prisma/client';
import { paginate, skipTake } from '../common/utils/pagination';
import { ConversionEvent } from '../integrations/affiliate/affiliate-provider';
import { AffiliateRegistry } from '../integrations/affiliate/affiliate.registry';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { calculateCommission, RuleInput, selectRule } from './commission-calculator';
import { CommissionQueryDto, ConversionQueryDto, CreatePayoutDto, CreateRuleDto, PayoutQueryDto, UpdateRuleDto } from './dto/commission.dto';

@Injectable()
export class CommissionsService {
  private readonly logger = new Logger(CommissionsService.name);

  constructor(private prisma: PrismaService, private notifications: NotificationsService, private affiliate: AffiliateRegistry) {}

  /**
   * Record evidence-backed conversion data from a trusted source (verified provider callback or admin import).
   * Idempotent on (provider, externalId). Never invents conversions from clicks.
   */
  async recordConversion(event: ConversionEvent) {
    const click = event.attributionRef
      ? await this.prisma.productClick.findUnique({ where: { attributionRef: event.attributionRef }, include: { product: { select: { brandId: true, categoryId: true } } } })
      : null;

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.affiliateConversion.findUnique({ where: { provider_externalId: { provider: event.provider, externalId: event.externalId } }, include: { commission: true } });

      // A confirmed conversion must not be downgraded by a late/out-of-order "pending" event.
      const status = existing?.status === ConversionStatus.CONFIRMED && event.status === ConversionStatus.PENDING ? existing.status : event.status;

      const conversion = existing
        ? await tx.affiliateConversion.update({
            where: { id: existing.id },
            data: { status, orderAmount: event.orderAmount, currency: event.currency, rawPayload: event.raw as Prisma.InputJsonValue, merchantReference: event.merchantReference ?? existing.merchantReference },
            include: { commission: true },
          })
        : await tx.affiliateConversion.create({
            data: {
              provider: event.provider, externalId: event.externalId, attributionRef: event.attributionRef, clickId: click?.id, creatorId: click?.creatorId,
              status, orderAmount: event.orderAmount, currency: event.currency, merchantReference: event.merchantReference,
              rawPayload: event.raw as Prisma.InputJsonValue, occurredAt: event.occurredAt,
            },
            include: { commission: true },
          });

      if (status === ConversionStatus.CONFIRMED && conversion.creatorId && !conversion.commission) {
        const rules = await tx.commissionRule.findMany({ where: { isActive: true } });
        const rule = selectRule(
          rules.map((r): RuleInput => ({ ...r, rate: Number(r.rate) })),
          { creatorId: conversion.creatorId, brandId: click?.product.brandId, categoryId: click?.product.categoryId },
        );
        if (!rule) {
          this.logger.warn(`No active commission rule for conversion ${conversion.id}; no commission created`);
        } else {
          const amount = calculateCommission(Number(conversion.orderAmount), Number(rule.rate));
          await tx.commissionRecord.create({
            data: { conversionId: conversion.id, creatorId: conversion.creatorId, amount, currency: conversion.currency, rate: rule.rate, ruleId: rule.id, status: CommissionStatus.PENDING },
          });
        }
      }

      if ((status === ConversionStatus.REVERSED || status === ConversionStatus.REJECTED) && conversion.commission) {
        if (conversion.commission.status === CommissionStatus.PAID) {
          this.logger.warn(`Conversion ${conversion.id} reversed after commission ${conversion.commission.id} was paid; manual clawback needed`);
        } else if (conversion.commission.status !== CommissionStatus.VOID) {
          await tx.commissionRecord.update({ where: { id: conversion.commission.id }, data: { status: CommissionStatus.VOID, payoutId: null } });
        }
      }
      return conversion;
    });
  }

  // ---- creator view ----

  /** Commission totals by lifecycle stage. Only reflects records backed by recorded conversions. */
  async creatorSummary(creatorId: string) {
    const groups = await this.prisma.commissionRecord.groupBy({ by: ['status', 'currency'], where: { creatorId }, _sum: { amount: true }, _count: true });
    const byStatus = (s: CommissionStatus) => groups.filter((g) => g.status === s).map((g) => ({ currency: g.currency, amount: Number(g._sum.amount ?? 0), count: g._count }));
    return {
      pending: byStatus('PENDING'), approved: byStatus('APPROVED'), payable: byStatus('PAYABLE'), paid: byStatus('PAID'),
    };
  }

  // ---- admin ----

  async listConversions(q: ConversionQueryDto) {
    const where: Prisma.AffiliateConversionWhereInput = { ...(q.status ? { status: q.status } : {}), ...(q.creatorId ? { creatorId: q.creatorId } : {}) };
    const [items, total] = await Promise.all([
      this.prisma.affiliateConversion.findMany({ where, orderBy: { occurredAt: 'desc' }, include: { commission: true, creator: { select: { handle: true } } }, ...skipTake(q.page, q.limit) }),
      this.prisma.affiliateConversion.count({ where }),
    ]);
    return paginate(items, total, q.page, q.limit);
  }

  async listCommissions(q: CommissionQueryDto) {
    const where: Prisma.CommissionRecordWhereInput = { ...(q.status ? { status: q.status } : {}), ...(q.creatorId ? { creatorId: q.creatorId } : {}) };
    const [items, total] = await Promise.all([
      this.prisma.commissionRecord.findMany({ where, orderBy: { createdAt: 'desc' }, include: { creator: { select: { handle: true } }, conversion: { select: { provider: true, externalId: true, orderAmount: true, status: true } } }, ...skipTake(q.page, q.limit) }),
      this.prisma.commissionRecord.count({ where }),
    ]);
    return paginate(items, total, q.page, q.limit);
  }

  async approveCommission(id: string) {
    const c = await this.prisma.commissionRecord.findUnique({ where: { id }, include: { conversion: true } });
    if (!c) throw new NotFoundException('Commission not found');
    if (c.status !== CommissionStatus.PENDING) throw new BadRequestException(`Only PENDING commissions can be approved (current: ${c.status})`);
    if (c.conversion.status !== ConversionStatus.CONFIRMED) throw new BadRequestException('The underlying conversion is not confirmed');
    return this.prisma.commissionRecord.update({ where: { id }, data: { status: CommissionStatus.APPROVED } });
  }

  async voidCommission(id: string) {
    const c = await this.prisma.commissionRecord.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Commission not found');
    if (c.status === CommissionStatus.PAID) throw new BadRequestException('Paid commissions cannot be voided');
    return this.prisma.commissionRecord.update({ where: { id }, data: { status: CommissionStatus.VOID, payoutId: null } });
  }

  async listRules() {
    return this.prisma.commissionRule.findMany({ orderBy: [{ scope: 'asc' }, { createdAt: 'desc' }] });
  }

  async createRule(dto: CreateRuleDto) {
    const target = { CREATOR: dto.creatorId, BRAND: dto.brandId, CATEGORY: dto.categoryId, DEFAULT: true }[dto.scope];
    if (!target) throw new BadRequestException(`A ${dto.scope.toLowerCase()} rule needs its target id`);
    return this.prisma.commissionRule.create({
      data: { name: dto.name, scope: dto.scope, rate: dto.rate, categoryId: dto.scope === 'CATEGORY' ? dto.categoryId : null, brandId: dto.scope === 'BRAND' ? dto.brandId : null, creatorId: dto.scope === 'CREATOR' ? dto.creatorId : null },
    });
  }

  async updateRule(id: string, dto: UpdateRuleDto) {
    return this.prisma.commissionRule.update({ where: { id }, data: dto });
  }

  async listPayouts(q: PayoutQueryDto) {
    const where: Prisma.PayoutWhereInput = { ...(q.status ? { status: q.status } : {}), ...(q.creatorId ? { creatorId: q.creatorId } : {}) };
    const [items, total] = await Promise.all([
      this.prisma.payout.findMany({ where, orderBy: { createdAt: 'desc' }, include: { creator: { select: { handle: true } }, _count: { select: { commissions: true } } }, ...skipTake(q.page, q.limit) }),
      this.prisma.payout.count({ where }),
    ]);
    return paginate(items, total, q.page, q.limit);
  }

  /** Bundles a creator's APPROVED commissions into a DRAFT payout record for admin review. Moves no money. */
  async createPayout(adminId: string, dto: CreatePayoutDto) {
    const currency = (dto.currency ?? 'USD').toUpperCase();
    return this.prisma.$transaction(async (tx) => {
      const commissions = await tx.commissionRecord.findMany({ where: { creatorId: dto.creatorId, status: CommissionStatus.APPROVED, currency, payoutId: null } });
      if (commissions.length === 0) throw new BadRequestException('No approved commissions available for payout');
      const cents = commissions.reduce((sum, c) => sum + Math.round(Number(c.amount) * 100), 0);
      const payout = await tx.payout.create({ data: { creatorId: dto.creatorId, amount: cents / 100, currency, note: dto.note, reviewedById: adminId, status: PayoutStatus.DRAFT } });
      await tx.commissionRecord.updateMany({ where: { id: { in: commissions.map((c) => c.id) } }, data: { payoutId: payout.id, status: CommissionStatus.PAYABLE } });
      return payout;
    });
  }

  /** Admin confirms they paid the creator out-of-band; Reccora only records it. */
  async markPayoutPaid(adminId: string, id: string, reference: string) {
    const payout = await this.prisma.payout.findUnique({ where: { id }, include: { creator: { select: { userId: true } } } });
    if (!payout) throw new NotFoundException('Payout not found');
    if (payout.status !== PayoutStatus.DRAFT && payout.status !== PayoutStatus.APPROVED) throw new BadRequestException(`Payout is ${payout.status}`);
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.commissionRecord.updateMany({ where: { payoutId: id, status: CommissionStatus.PAYABLE }, data: { status: CommissionStatus.PAID } });
      return tx.payout.update({ where: { id }, data: { status: PayoutStatus.PAID, paidAt: new Date(), reference, reviewedById: adminId } });
    });
    await this.notifications.create(payout.creator.userId, NotificationType.COMMISSION_UPDATE, 'Payout recorded', `A payout of ${payout.amount} ${payout.currency} was recorded as paid (ref ${reference}).`, { payoutId: id });
    return updated;
  }

  async cancelPayout(adminId: string, id: string) {
    const payout = await this.prisma.payout.findUnique({ where: { id } });
    if (!payout) throw new NotFoundException('Payout not found');
    if (payout.status === PayoutStatus.PAID) throw new BadRequestException('Paid payouts cannot be cancelled');
    return this.prisma.$transaction(async (tx) => {
      await tx.commissionRecord.updateMany({ where: { payoutId: id, status: CommissionStatus.PAYABLE }, data: { status: CommissionStatus.APPROVED, payoutId: null } });
      return tx.payout.update({ where: { id }, data: { status: PayoutStatus.CANCELLED, reviewedById: adminId } });
    });
  }

  get conversionTrackingConfigured() {
    return this.affiliate.conversionTrackingConfigured;
  }
}
