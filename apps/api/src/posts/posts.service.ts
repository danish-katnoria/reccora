import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MediaType, NotificationType, PostStatus, ProductStatus } from '@prisma/client';
import { CreatorsService } from '../creators/creators.service';
import { StorageService } from '../integrations/storage/storage.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { postInclude, toPostDto } from './post.mapper';
import { CreatePostDto, UpdatePostDto } from './dto/post.dto';
import { paginate, skipTake } from '../common/utils/pagination';

@Injectable()
export class PostsService {
  constructor(
    private prisma: PrismaService,
    private creators: CreatorsService,
    private storage: StorageService,
    private notifications: NotificationsService,
  ) {}

  private assertManagedMedia(...urls: (string | undefined)[]) {
    for (const u of urls) {
      if (u && !this.storage.isManagedUrl(u)) throw new BadRequestException('Media must be uploaded through Reccora uploads');
    }
  }

  private async assertProducts(productIds: string[]) {
    const unique = [...new Set(productIds)];
    const count = await this.prisma.product.count({ where: { id: { in: unique }, status: ProductStatus.ACTIVE } });
    if (count !== unique.length) throw new BadRequestException('One or more products are unavailable');
    return unique;
  }

  async create(userId: string, dto: CreatePostDto) {
    const creator = await this.creators.requireApproved(userId);
    this.assertManagedMedia(dto.mediaUrl, dto.thumbnailUrl);
    const productIds = await this.assertProducts(dto.productIds);
    if (dto.collectionId) {
      const col = await this.prisma.collection.findFirst({ where: { id: dto.collectionId, creatorId: creator.id }, select: { id: true } });
      if (!col) throw new ForbiddenException('Collection not found or not yours');
    }
    const publish = (dto.status ?? 'PUBLISHED') === 'PUBLISHED';

    const post = await this.prisma.$transaction(async (tx) => {
      const created = await tx.post.create({
        data: {
          creatorId: creator.id,
          caption: dto.caption,
          mediaUrl: dto.mediaUrl,
          mediaType: dto.mediaType ?? MediaType.IMAGE,
          thumbnailUrl: dto.thumbnailUrl,
          status: publish ? PostStatus.PUBLISHED : PostStatus.DRAFT,
          publishedAt: publish ? new Date() : null,
          products: { create: productIds.map((productId, position) => ({ productId, position })) },
        },
      });
      // Recommended products become part of the creator's storefront.
      await tx.storefrontProduct.createMany({ data: productIds.map((productId) => ({ creatorId: creator.id, productId })), skipDuplicates: true });
      if (dto.collectionId) {
        const base = await tx.collectionProduct.count({ where: { collectionId: dto.collectionId } });
        await tx.collectionProduct.createMany({ data: productIds.map((productId, i) => ({ collectionId: dto.collectionId!, productId, position: base + i })), skipDuplicates: true });
      }
      return created;
    });

    if (publish) await this.notifyFollowers(creator.id, userId, post.id);
    return this.getOwn(userId, post.id);
  }

  private async notifyFollowers(creatorId: string, creatorUserId: string, postId: string) {
    const [followers, owner] = await Promise.all([
      this.prisma.follow.findMany({ where: { creatorId, follower: { status: 'ACTIVE' } }, select: { followerId: true }, take: 5000 }),
      this.prisma.user.findUniqueOrThrow({ where: { id: creatorUserId }, select: { displayName: true } }),
    ]);
    await this.notifications.createMany(followers.map((f) => f.followerId), NotificationType.POST_PUBLISHED, `${owner.displayName} shared a new recommendation`, undefined, { postId });
  }

  private async requireOwned(userId: string, id: string) {
    const post = await this.prisma.post.findUnique({ where: { id }, include: { creator: { select: { userId: true } } } });
    if (!post || post.status === PostStatus.REMOVED) throw new NotFoundException('Post not found');
    if (post.creator.userId !== userId) throw new ForbiddenException('You can only modify your own posts');
    return post;
  }

  async update(userId: string, id: string, dto: UpdatePostDto) {
    const post = await this.requireOwned(userId, id);
    this.assertManagedMedia(dto.mediaUrl, dto.thumbnailUrl);
    const productIds = dto.productIds ? await this.assertProducts(dto.productIds) : undefined;
    const publishing = dto.status === 'PUBLISHED' && post.status !== PostStatus.PUBLISHED;

    await this.prisma.$transaction(async (tx) => {
      if (productIds) {
        await tx.postProduct.deleteMany({ where: { postId: id } });
        await tx.postProduct.createMany({ data: productIds.map((productId, position) => ({ postId: id, productId, position })) });
        await tx.storefrontProduct.createMany({ data: productIds.map((productId) => ({ creatorId: post.creatorId, productId })), skipDuplicates: true });
      }
      await tx.post.update({
        where: { id },
        data: {
          caption: dto.caption, mediaUrl: dto.mediaUrl, mediaType: dto.mediaType, thumbnailUrl: dto.thumbnailUrl,
          ...(dto.status ? { status: dto.status, ...(publishing ? { publishedAt: new Date() } : {}) } : {}),
        },
      });
    });
    if (publishing) await this.notifyFollowers(post.creatorId, userId, id);
    return this.getOwn(userId, id);
  }

  async remove(userId: string, id: string) {
    await this.requireOwned(userId, id);
    await this.prisma.post.delete({ where: { id } });
    return { success: true };
  }

  async getOwn(userId: string, id: string) {
    await this.requireOwned(userId, id);
    const post = await this.prisma.post.findUniqueOrThrow({ where: { id }, include: postInclude });
    return toPostDto(post);
  }

  async listOwn(userId: string, page: number, limit: number) {
    const creator = await this.creators.requireOwn(userId);
    const where = { creatorId: creator.id, status: { not: PostStatus.REMOVED } };
    const [rows, total] = await Promise.all([
      this.prisma.post.findMany({ where, orderBy: { createdAt: 'desc' }, include: postInclude, ...skipTake(page, limit) }),
      this.prisma.post.count({ where }),
    ]);
    return paginate(rows.map((r) => toPostDto(r)), total, page, limit);
  }

  async getPublic(id: string, viewerId?: string) {
    const post = await this.prisma.post.findFirst({
      where: { id, status: PostStatus.PUBLISHED, creator: { status: 'APPROVED', user: { status: 'ACTIVE' } } },
      include: postInclude,
    });
    if (!post) throw new NotFoundException('Post not found');
    const [saved, following] = await Promise.all([
      this.savedSet(viewerId, post.products.map((p) => p.productId)),
      viewerId ? this.creators.followingSet(viewerId, [post.creatorId]) : undefined,
    ]);
    return toPostDto(post, { saved, following });
  }

  private async savedSet(viewerId: string | undefined, ids: string[]) {
    if (!viewerId) return undefined;
    const rows = await this.prisma.savedProduct.findMany({ where: { userId: viewerId, productId: { in: ids } }, select: { productId: true } });
    return new Set(rows.map((r) => r.productId));
  }
}
