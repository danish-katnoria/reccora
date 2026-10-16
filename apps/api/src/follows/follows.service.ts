import { BadRequestException, Injectable } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { paginate, skipTake } from '../common/utils/pagination';
import { CreatorsService, creatorSelect } from '../creators/creators.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FollowsService {
  constructor(private prisma: PrismaService, private creators: CreatorsService, private notifications: NotificationsService) {}

  async follow(userId: string, handle: string) {
    const creator = await this.creators.findPublicByHandle(handle);
    const owner = await this.prisma.creatorProfile.findUniqueOrThrow({ where: { id: creator.id }, select: { userId: true } });
    if (owner.userId === userId) throw new BadRequestException('You cannot follow yourself');

    const created = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.follow.findUnique({ where: { followerId_creatorId: { followerId: userId, creatorId: creator.id } } });
      if (existing) return false;
      await tx.follow.create({ data: { followerId: userId, creatorId: creator.id } });
      await tx.creatorProfile.update({ where: { id: creator.id }, data: { followerCount: { increment: 1 } } });
      return true;
    });

    if (created) {
      const follower = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { displayName: true, showActivity: true } });
      if (follower.showActivity) {
        await this.notifications.create(owner.userId, NotificationType.NEW_FOLLOWER, 'New follower', `${follower.displayName} started following you`, { followerId: userId });
      }
    }
    const fresh = await this.prisma.creatorProfile.findUniqueOrThrow({ where: { id: creator.id }, select: { followerCount: true } });
    return { isFollowing: true, followerCount: fresh.followerCount };
  }

  async unfollow(userId: string, handle: string) {
    const creator = await this.creators.findPublicByHandle(handle);
    await this.prisma.$transaction(async (tx) => {
      const res = await tx.follow.deleteMany({ where: { followerId: userId, creatorId: creator.id } });
      if (res.count > 0) await tx.creatorProfile.update({ where: { id: creator.id }, data: { followerCount: { decrement: 1 } } });
    });
    const fresh = await this.prisma.creatorProfile.findUniqueOrThrow({ where: { id: creator.id }, select: { followerCount: true } });
    return { isFollowing: false, followerCount: fresh.followerCount };
  }

  async listFollowing(userId: string, page: number, limit: number) {
    const where = { followerId: userId, creator: { status: 'APPROVED' as const, user: { status: 'ACTIVE' as const } } };
    const [rows, total] = await Promise.all([
      this.prisma.follow.findMany({ where, orderBy: { createdAt: 'desc' }, ...skipTake(page, limit), select: { creator: { select: creatorSelect } } }),
      this.prisma.follow.count({ where }),
    ]);
    return paginate(rows.map((r) => this.creators.toDto(r.creator, true)), total, page, limit);
  }
}
