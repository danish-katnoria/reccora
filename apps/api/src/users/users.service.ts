import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { CreatorStatus, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto, DeleteAccountDto, UpdateMeDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getMe(id: string) {
    const u = await this.prisma.user.findUniqueOrThrow({ where: { id }, include: { creatorProfile: true } });
    return {
      id: u.id, email: u.email, displayName: u.displayName, role: u.role, avatarUrl: u.avatarUrl,
      isProfilePrivate: u.isProfilePrivate, showActivity: u.showActivity, emailVerified: !!u.emailVerifiedAt,
      creatorProfile: u.creatorProfile ? { id: u.creatorProfile.id, handle: u.creatorProfile.handle, status: u.creatorProfile.status } : null,
    };
  }

  async updateMe(id: string, dto: UpdateMeDto) {
    await this.prisma.user.update({ where: { id }, data: dto });
    return this.getMe(id);
  }

  async changePassword(id: string, dto: ChangePasswordDto) {
    const u = await this.prisma.user.findUniqueOrThrow({ where: { id } });
    if (!(await bcrypt.compare(dto.currentPassword, u.passwordHash))) throw new UnauthorizedException('Current password is incorrect');
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id }, data: { passwordHash } }),
      this.prisma.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    return { success: true };
  }

  /**
   * Account deletion: anonymises the account and revokes all sessions. Creator content is hidden
   * (profile suspended) while financial records (clicks, conversions, commissions) are retained for audit.
   */
  async deleteMe(id: string, dto: DeleteAccountDto) {
    const u = await this.prisma.user.findUniqueOrThrow({ where: { id } });
    if (u.role === 'ADMIN') throw new ForbiddenException('Administrator accounts cannot be self-deleted');
    if (!(await bcrypt.compare(dto.password, u.passwordHash))) throw new UnauthorizedException('Password is incorrect');
    const tombstone = randomUUID();
    await this.prisma.$transaction([
      this.prisma.refreshToken.deleteMany({ where: { userId: id } }),
      this.prisma.follow.deleteMany({ where: { followerId: id } }),
      this.prisma.savedProduct.deleteMany({ where: { userId: id } }),
      this.prisma.savedCollection.deleteMany({ where: { userId: id } }),
      this.prisma.productView.deleteMany({ where: { userId: id } }),
      this.prisma.notification.deleteMany({ where: { userId: id } }),
      this.prisma.creatorProfile.updateMany({ where: { userId: id }, data: { status: CreatorStatus.SUSPENDED, bio: null, avatarUrl: null, coverUrl: null, handle: `deleted_${tombstone.slice(0, 8)}` } }),
      this.prisma.user.update({
        where: { id },
        data: { status: UserStatus.DELETED, deletedAt: new Date(), email: `deleted+${tombstone}@deleted.invalid`, displayName: 'Deleted user', avatarUrl: null, passwordHash: '!' },
      }),
    ]);
    return { success: true };
  }
}
