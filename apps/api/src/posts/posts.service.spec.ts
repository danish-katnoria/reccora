import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { createPrismaMock } from '../../test/prisma-mock';
import { PostsService } from './posts.service';

describe('PostsService', () => {
  let prisma: any;
  let svc: PostsService;
  const creators = { requireApproved: jest.fn(), requireOwn: jest.fn(), followingSet: jest.fn() };
  const storage = { isManagedUrl: jest.fn((u: string) => u.startsWith('https://cdn.test/')) };
  const notifications = { createMany: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    svc = new PostsService(prisma, creators as any, storage as any, notifications as any);
    creators.requireApproved.mockResolvedValue({ id: 'cr1' });
    prisma.product.count.mockResolvedValue(1);
    prisma.post.create.mockResolvedValue({ id: 'post1' });
    prisma.follow.findMany.mockResolvedValue([{ followerId: 'f1' }, { followerId: 'f2' }]);
    prisma.user.findUniqueOrThrow.mockResolvedValue({ displayName: 'Maya' });
    prisma.post.findUnique.mockResolvedValue({ id: 'post1', status: 'PUBLISHED', creatorId: 'cr1', creator: { userId: 'u1' } });
    prisma.post.findUniqueOrThrow.mockResolvedValue({ id: 'post1', caption: 'c', mediaUrl: 'https://cdn.test/a.jpg', mediaType: 'IMAGE', status: 'PUBLISHED', creator: { id: 'cr1', handle: 'maya', user: { displayName: 'M' } }, products: [] });
  });

  const dto = { caption: 'Love it', mediaUrl: 'https://cdn.test/a.jpg', productIds: ['11111111-1111-1111-1111-111111111111'] };

  it('publishes a post, adds products to the storefront and notifies followers', async () => {
    await svc.create('u1', dto);
    expect(prisma.post.create.mock.calls[0][0].data).toMatchObject({ creatorId: 'cr1', status: 'PUBLISHED' });
    expect(prisma.storefrontProduct.createMany).toHaveBeenCalled();
    expect(notifications.createMany).toHaveBeenCalledWith(['f1', 'f2'], 'POST_PUBLISHED', expect.any(String), undefined, { postId: 'post1' });
  });

  it('does not notify followers for drafts', async () => {
    await svc.create('u1', { ...dto, status: 'DRAFT' });
    expect(notifications.createMany).not.toHaveBeenCalled();
  });

  it('rejects media that was not uploaded through Reccora', async () => {
    await expect(svc.create('u1', { ...dto, mediaUrl: 'https://evil.test/x.jpg' })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.post.create).not.toHaveBeenCalled();
  });

  it('rejects unavailable products', async () => {
    prisma.product.count.mockResolvedValue(0);
    await expect(svc.create('u1', dto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects adding to someone else\'s collection', async () => {
    prisma.collection.findFirst.mockResolvedValue(null);
    await expect(svc.create('u1', { ...dto, collectionId: '22222222-2222-2222-2222-222222222222' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  describe('ownership', () => {
    it('lets the owner edit and delete', async () => {
      await svc.update('u1', 'post1', { caption: 'new' });
      expect(prisma.post.update).toHaveBeenCalled();
      await svc.remove('u1', 'post1');
      expect(prisma.post.delete).toHaveBeenCalledWith({ where: { id: 'post1' } });
    });
    it('forbids other creators from editing or deleting', async () => {
      await expect(svc.update('intruder', 'post1', { caption: 'x' })).rejects.toBeInstanceOf(ForbiddenException);
      await expect(svc.remove('intruder', 'post1')).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.post.update).not.toHaveBeenCalled();
      expect(prisma.post.delete).not.toHaveBeenCalled();
    });
    it('treats removed posts as not found', async () => {
      prisma.post.findUnique.mockResolvedValue({ id: 'post1', status: 'REMOVED', creator: { userId: 'u1' } });
      await expect(svc.update('u1', 'post1', { caption: 'x' })).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
