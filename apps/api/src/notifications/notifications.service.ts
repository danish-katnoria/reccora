import { Injectable } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paginate, skipTake } from '../common/utils/pagination';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  create(userId: string, type: NotificationType, title: string, body?: string, data?: Prisma.InputJsonValue) {
    return this.prisma.notification.create({ data: { userId, type, title, body, data } });
  }

  createMany(userIds: string[], type: NotificationType, title: string, body?: string, data?: Prisma.InputJsonValue) {
    if (userIds.length === 0) return Promise.resolve({ count: 0 });
    return this.prisma.notification.createMany({ data: userIds.map((userId) => ({ userId, type, title, body, data })) });
  }

  async list(userId: string, page: number, limit: number) {
    const where = { userId };
    const [items, total, unread] = await Promise.all([
      this.prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, ...skipTake(page, limit) }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    return { ...paginate(items, total, page, limit), unread };
  }

  async markRead(userId: string, id: string) {
    await this.prisma.notification.updateMany({ where: { id, userId, readAt: null }, data: { readAt: new Date() } });
    return { success: true };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
    return { success: true };
  }
}
