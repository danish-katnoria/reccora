import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreatorStatus, NotificationType, PostStatus, Prisma, ReportStatus, ReportTargetType, UserStatus } from '@prisma/client';
import { paginate, skipTake } from '../common/utils/pagination';
import { slugify } from '../common/utils/slug';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { AdminCreatorQueryDto, AdminPostQueryDto, AdminReportQueryDto, AdminUserQueryDto, CreateBrandDto, CreateReportDto, ResolveReportDto, UpdateBrandDto } from './dto/admin.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService, private notifications: NotificationsService) {}

  async overview() {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [users, creators, pendingCreators, products, posts, openReports, clicks30, visits30, conversions, commissionGroups, brands] = await Promise.all([
      this.prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
      this.prisma.creatorProfile.count({ where: { status: CreatorStatus.APPROVED } }),
      this.prisma.creatorProfile.count({ where: { status: CreatorStatus.PENDING } }),
      this.prisma.product.count({ where: { status: 'ACTIVE' } }),
      this.prisma.post.count({ where: { status: PostStatus.PUBLISHED } }),
      this.prisma.report.count({ where: { status: { in: [ReportStatus.OPEN, ReportStatus.REVIEWING] } } }),
      this.prisma.productClick.count({ where: { createdAt: { gte: since } } }),
      this.prisma.storefrontVisit.count({ where: { createdAt: { gte: since } } }),
      this.prisma.affiliateConversion.groupBy({ by: ['status'], _count: true }),
      this.prisma.commissionRecord.groupBy({ by: ['status'], _count: true, _sum: { amount: true } }),
      this.prisma.brand.count({ where: { isActive: true } }),
    ]);
    const daily = await this.prisma.$queryRaw<{ day: Date; clicks: bigint }[]>`
      SELECT date_trunc('day', "createdAt") AS day, count(*)::bigint AS clicks
      FROM "ProductClick" WHERE "createdAt" >= ${since} GROUP BY 1 ORDER BY 1`;
    return {
      totals: { users, creators, pendingCreators, products, brands, publishedPosts: posts, openReports },
      last30Days: { productClicks: clicks30, storefrontVisits: visits30 },
      clicksByDay: daily.map((d) => ({ day: d.day, clicks: Number(d.clicks) })),
      conversions: conversions.map((c) => ({ status: c.status, count: c._count })),
      commissions: commissionGroups.map((c) => ({ status: c.status, count: c._count, amount: Number(c._sum.amount ?? 0) })),
    };
  }

  // ---- users ----
  async listUsers(q: AdminUserQueryDto) {
    const where: Prisma.UserWhereInput = {
      ...(q.role ? { role: q.role } : {}), ...(q.status ? { status: q.status } : {}),
      ...(q.q ? { OR: [{ email: { contains: q.q, mode: 'insensitive' } }, { displayName: { contains: q.q, mode: 'insensitive' } }] } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, select: { id: true, email: true, displayName: true, role: true, status: true, createdAt: true, emailVerifiedAt: true }, ...skipTake(q.page, q.limit) }),
      this.prisma.user.count({ where }),
    ]);
    return paginate(items, total, q.page, q.limit);
  }

  async setUserStatus(adminId: string, id: string, status: UserStatus) {
    if (id === adminId) throw new ForbiddenException('You cannot change your own status');
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (user.status === UserStatus.DELETED) throw new BadRequestException('Deleted accounts cannot be modified');
    if (status === UserStatus.DELETED) throw new BadRequestException('Use account deletion flow instead');
    const updated = await this.prisma.user.update({ where: { id }, data: { status }, select: { id: true, email: true, status: true, role: true } });
    if (status === UserStatus.SUSPENDED) await this.prisma.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    return updated;
  }

  // ---- creators ----
  async listCreators(q: AdminCreatorQueryDto) {
    const where: Prisma.CreatorProfileWhereInput = {
      ...(q.status ? { status: q.status } : {}),
      ...(q.q ? { OR: [{ handle: { contains: q.q, mode: 'insensitive' } }, { user: { displayName: { contains: q.q, mode: 'insensitive' } } }, { user: { email: { contains: q.q, mode: 'insensitive' } } }] } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.creatorProfile.findMany({ where, orderBy: { createdAt: 'desc' }, include: { user: { select: { email: true, displayName: true } }, _count: { select: { posts: true } } }, ...skipTake(q.page, q.limit) }),
      this.prisma.creatorProfile.count({ where }),
    ]);
    return paginate(items, total, q.page, q.limit);
  }

  async setCreatorStatus(id: string, status: CreatorStatus) {
    const creator = await this.prisma.creatorProfile.findUnique({ where: { id } });
    if (!creator) throw new NotFoundException('Creator not found');
    const updated = await this.prisma.creatorProfile.update({ where: { id }, data: { status } });
    if (status !== creator.status && status !== CreatorStatus.PENDING) {
      const approved = status === CreatorStatus.APPROVED;
      await this.notifications.create(
        creator.userId,
        approved ? NotificationType.CREATOR_APPROVED : NotificationType.CREATOR_SUSPENDED,
        approved ? 'Your creator account is approved' : 'Your creator account was suspended',
        approved ? 'You can now publish recommendations.' : 'Contact support if you think this is a mistake.',
      );
    }
    return updated;
  }

  // ---- brands ----
  async listBrands(q: PaginationDto) {
    const [items, total] = await Promise.all([
      this.prisma.brand.findMany({ orderBy: { name: 'asc' }, ...skipTake(q.page, q.limit) }),
      this.prisma.brand.count(),
    ]);
    return paginate(items, total, q.page, q.limit);
  }

  /** Unpaginated brand options for product forms. */
  brandOptions() {
    return this.prisma.brand.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } });
  }

  async createBrand(dto: CreateBrandDto) {
    const slug = slugify(dto.name);
    if (await this.prisma.brand.findUnique({ where: { slug } })) throw new ConflictException('Brand already exists');
    return this.prisma.brand.create({ data: { ...dto, slug } });
  }

  updateBrand(id: string, dto: UpdateBrandDto) {
    return this.prisma.brand.update({ where: { id }, data: dto });
  }

  // ---- content moderation ----
  async listPosts(q: AdminPostQueryDto) {
    const where: Prisma.PostWhereInput = { ...(q.status ? { status: q.status } : {}), ...(q.q ? { caption: { contains: q.q, mode: 'insensitive' } } : {}) };
    const [items, total] = await Promise.all([
      this.prisma.post.findMany({ where, orderBy: { createdAt: 'desc' }, include: { creator: { select: { handle: true } }, _count: { select: { products: true } } }, ...skipTake(q.page, q.limit) }),
      this.prisma.post.count({ where }),
    ]);
    return paginate(items, total, q.page, q.limit);
  }

  async setPostStatus(id: string, status: PostStatus) {
    const post = await this.prisma.post.findUnique({ where: { id }, include: { creator: { select: { userId: true } } } });
    if (!post) throw new NotFoundException('Post not found');
    const updated = await this.prisma.post.update({ where: { id }, data: { status } });
    if (status === PostStatus.REMOVED && post.status !== PostStatus.REMOVED) {
      await this.notifications.create(post.creator.userId, NotificationType.POST_REMOVED, 'A post was removed by moderators', post.caption.slice(0, 80), { postId: id });
    }
    return updated;
  }

  // ---- reports ----
  async createReport(reporterId: string, dto: CreateReportDto) {
    const exists =
      dto.targetType === ReportTargetType.POST ? await this.prisma.post.count({ where: { id: dto.targetId } })
      : dto.targetType === ReportTargetType.CREATOR ? await this.prisma.creatorProfile.count({ where: { id: dto.targetId } })
      : await this.prisma.product.count({ where: { id: dto.targetId } });
    if (!exists) throw new NotFoundException('Reported item not found');
    return this.prisma.report.create({ data: { reporterId, ...dto } });
  }

  async listReports(q: AdminReportQueryDto) {
    const where: Prisma.ReportWhereInput = { ...(q.status ? { status: q.status } : {}) };
    const [items, total] = await Promise.all([
      this.prisma.report.findMany({ where, orderBy: { createdAt: 'desc' }, include: { reporter: { select: { email: true, displayName: true } } }, ...skipTake(q.page, q.limit) }),
      this.prisma.report.count({ where }),
    ]);
    return paginate(items, total, q.page, q.limit);
  }

  async resolveReport(adminId: string, id: string, dto: ResolveReportDto) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Report not found');
    if (dto.removeContent) {
      if (report.targetType === ReportTargetType.POST) await this.setPostStatus(report.targetId, PostStatus.REMOVED);
      else if (report.targetType === ReportTargetType.PRODUCT) await this.prisma.product.update({ where: { id: report.targetId }, data: { status: 'DISABLED' } });
      else await this.setCreatorStatus(report.targetId, CreatorStatus.SUSPENDED);
    }
    return this.prisma.report.update({ where: { id }, data: { status: dto.status, resolution: dto.resolution, reviewedById: adminId } });
  }

  // ---- tracking records ----
  async listClicks(q: PaginationDto & { productId?: string; creatorId?: string }) {
    const where: Prisma.ProductClickWhereInput = { ...(q.productId ? { productId: q.productId } : {}), ...(q.creatorId ? { creatorId: q.creatorId } : {}) };
    const [items, total] = await Promise.all([
      this.prisma.productClick.findMany({ where, orderBy: { createdAt: 'desc' }, include: { product: { select: { title: true } }, creator: { select: { handle: true } } }, ...skipTake(q.page, q.limit) }),
      this.prisma.productClick.count({ where }),
    ]);
    return paginate(items, total, q.page, q.limit);
  }
}
