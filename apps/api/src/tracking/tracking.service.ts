import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LinkStatus, ProductStatus } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { AppConfig } from '../config/configuration';
import { CommissionsService } from '../commissions/commissions.service';
import { CreatorsService } from '../creators/creators.service';
import { AffiliateRegistry } from '../integrations/affiliate/affiliate.registry';
import { PrismaService } from '../prisma/prisma.service';

export interface ClickContext {
  creatorHandle?: string;
  postId?: string;
  source?: string;
  userId?: string;
  userAgent?: string;
  ip?: string;
}

@Injectable()
export class TrackingService {
  private salt: string;

  constructor(
    private prisma: PrismaService,
    private affiliate: AffiliateRegistry,
    private creators: CreatorsService,
    private commissions: CommissionsService,
    config: ConfigService,
  ) {
    this.salt = config.get<AppConfig>('app')!.tracking.ipHashSalt;
  }

  /**
   * Validate product + approved merchant link, persist the click with an attribution reference and return the redirect target.
   * A click is only a click: it never produces a conversion or commission.
   */
  async recordClick(productId: string, ctx: ClickContext) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, status: ProductStatus.ACTIVE },
      select: { id: true, links: { where: { status: LinkStatus.APPROVED }, orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }], take: 1 } },
    });
    const link = product?.links[0];
    if (!product || !link) throw new NotFoundException('This product is not currently available to purchase');
    if (!/^https?:\/\//i.test(link.url)) throw new NotFoundException('Merchant link is invalid');

    // Credit a creator only if they actually feature the product.
    let creatorId: string | null = null;
    if (ctx.creatorHandle) {
      const creator = await this.prisma.creatorProfile.findFirst({
        where: { handle: ctx.creatorHandle.toLowerCase(), status: 'APPROVED', storefrontProducts: { some: { productId } } },
        select: { id: true },
      });
      creatorId = creator?.id ?? null;
    }

    const attributionRef = `rc_${randomBytes(12).toString('hex')}`;
    await this.prisma.productClick.create({
      data: {
        attributionRef, productId, linkId: link.id, creatorId, postId: ctx.postId, userId: ctx.userId, source: ctx.source?.slice(0, 30),
        userAgent: ctx.userAgent?.slice(0, 255),
        ipHash: ctx.ip ? createHash('sha256').update(this.salt + ctx.ip).digest('hex') : undefined,
      },
    });

    const provider = this.affiliate.get(link.affiliateProvider);
    const redirectUrl = provider ? provider.decorateUrl(link.url, attributionRef) : link.url;
    return { redirectUrl, attributionRef };
  }

  /** Entry point for verified provider callbacks. Rejects anything that fails signature verification. */
  async handleProviderCallback(providerName: string, rawBody: Buffer | string, headers: Record<string, string | string[] | undefined>, body: unknown) {
    const provider = this.affiliate.get(providerName);
    if (!provider || !provider.verifyCallback(rawBody, headers)) return null;
    const events = provider.parseCallback(body);
    const results = [];
    for (const e of events) results.push(await this.commissions.recordConversion(e));
    return { processed: results.length };
  }

  // ---- creator analytics ----

  async creatorAnalytics(userId: string, days: number) {
    const creator = await this.creators.requireOwn(userId);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const configured = this.commissions.conversionTrackingConfigured;

    const [visits, clicks, topGroups, recentPosts, profile, estimated, confirmed, summary] = await Promise.all([
      this.prisma.storefrontVisit.count({ where: { creatorId: creator.id, createdAt: { gte: since } } }),
      this.prisma.productClick.count({ where: { creatorId: creator.id, createdAt: { gte: since } } }),
      this.prisma.productClick.groupBy({ by: ['productId'], where: { creatorId: creator.id, createdAt: { gte: since } }, _count: { _all: true }, orderBy: { _count: { productId: 'desc' } }, take: 5 }),
      this.prisma.post.findMany({ where: { creatorId: creator.id, status: { not: 'REMOVED' } }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, caption: true, status: true, publishedAt: true, mediaUrl: true, thumbnailUrl: true, mediaType: true, products: { select: { productId: true } } } }),
      this.prisma.creatorProfile.findUniqueOrThrow({ where: { id: creator.id }, select: { followerCount: true } }),
      this.prisma.affiliateConversion.count({ where: { creatorId: creator.id, status: 'PENDING', occurredAt: { gte: since } } }),
      this.prisma.affiliateConversion.count({ where: { creatorId: creator.id, status: 'CONFIRMED', occurredAt: { gte: since } } }),
      this.commissions.creatorSummary(creator.id),
    ]);

    const products = await this.prisma.product.findMany({ where: { id: { in: topGroups.map((g) => g.productId) } }, select: { id: true, title: true, images: { take: 1, orderBy: { position: 'asc' }, select: { url: true } } } });
    const clicksPerPost = await Promise.all(recentPosts.map((p) => this.prisma.productClick.count({ where: { creatorId: creator.id, productId: { in: p.products.map((x) => x.productId) }, createdAt: { gte: since } } })));

    return {
      periodDays: days,
      followerCount: profile.followerCount,
      storefrontVisits: visits,
      productClicks: clicks,
      topProducts: topGroups.map((g) => {
        const p = products.find((x) => x.id === g.productId);
        return { productId: g.productId, title: p?.title ?? 'Unknown product', imageUrl: p?.images[0]?.url ?? null, clicks: g._count._all };
      }),
      recentActivity: recentPosts.map((p, i) => ({ id: p.id, caption: p.caption, status: p.status, publishedAt: p.publishedAt, mediaUrl: p.mediaUrl, thumbnailUrl: p.thumbnailUrl, mediaType: p.mediaType, productClicks: clicksPerPost[i] })),
      // Clicks are never sales. Conversions only appear once an affiliate integration reports them.
      conversions: configured
        ? { status: 'active' as const, estimated, confirmed }
        : { status: 'pending_integration' as const, estimated: null, confirmed: null, message: 'Conversion tracking is not available yet. Only clicks are measured.' },
      commissions: configured || [...summary.pending, ...summary.approved, ...summary.payable, ...summary.paid].length > 0 ? summary : null,
    };
  }
}
