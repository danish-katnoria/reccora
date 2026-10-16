import { BadRequestException } from '@nestjs/common';
import { createPrismaMock } from '../../test/prisma-mock';
import { FollowsService } from './follows.service';

describe('FollowsService', () => {
  let prisma: any;
  let svc: FollowsService;
  const notifications = { create: jest.fn() };
  const creators = { findPublicByHandle: jest.fn().mockResolvedValue({ id: 'cr1', handle: 'maya' }) };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    svc = new FollowsService(prisma, creators as any, notifications as any);
    prisma.creatorProfile.findUniqueOrThrow.mockResolvedValue({ userId: 'creatorUser', followerCount: 1 });
    prisma.user.findUniqueOrThrow.mockResolvedValue({ displayName: 'Sam', showActivity: true });
  });

  it('follows, increments the counter and notifies the creator', async () => {
    prisma.follow.findUnique.mockResolvedValue(null);
    const res = await svc.follow('shopper1', 'maya');
    expect(prisma.follow.create).toHaveBeenCalledWith({ data: { followerId: 'shopper1', creatorId: 'cr1' } });
    expect(prisma.creatorProfile.update).toHaveBeenCalledWith({ where: { id: 'cr1' }, data: { followerCount: { increment: 1 } } });
    expect(notifications.create).toHaveBeenCalledWith('creatorUser', 'NEW_FOLLOWER', expect.any(String), expect.any(String), expect.anything());
    expect(res.isFollowing).toBe(true);
  });

  it('is idempotent: following twice does not double count or re-notify', async () => {
    prisma.follow.findUnique.mockResolvedValue({ followerId: 'shopper1' });
    await svc.follow('shopper1', 'maya');
    expect(prisma.follow.create).not.toHaveBeenCalled();
    expect(prisma.creatorProfile.update).not.toHaveBeenCalled();
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('does not notify when the follower hides their activity', async () => {
    prisma.follow.findUnique.mockResolvedValue(null);
    prisma.user.findUniqueOrThrow.mockResolvedValue({ displayName: 'Sam', showActivity: false });
    await svc.follow('shopper1', 'maya');
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('prevents following yourself', async () => {
    prisma.creatorProfile.findUniqueOrThrow.mockResolvedValue({ userId: 'me' });
    await expect(svc.follow('me', 'maya')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('unfollow decrements only when a follow existed', async () => {
    prisma.follow.deleteMany.mockResolvedValue({ count: 1 });
    const res = await svc.unfollow('shopper1', 'maya');
    expect(prisma.creatorProfile.update).toHaveBeenCalledWith({ where: { id: 'cr1' }, data: { followerCount: { decrement: 1 } } });
    expect(res.isFollowing).toBe(false);
    prisma.creatorProfile.update.mockClear();
    prisma.follow.deleteMany.mockResolvedValue({ count: 0 });
    await svc.unfollow('shopper1', 'maya');
    expect(prisma.creatorProfile.update).not.toHaveBeenCalled();
  });
});
