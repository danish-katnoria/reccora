import { BadRequestException, ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CreatorStatus, Role, TokenPurpose, User, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { AppConfig } from '../config/configuration';
import { MailService } from '../integrations/mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from './dto/auth.dto';

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');
const DAY = 24 * 60 * 60 * 1000;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private cfg: AppConfig;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    config: ConfigService,
    private mail: MailService,
  ) {
    this.cfg = config.get<AppConfig>('app')!;
  }

  async register(dto: RegisterDto) {
    const role = dto.role === 'CREATOR' ? Role.CREATOR : Role.SHOPPER;
    if (role === Role.CREATOR && !dto.handle) throw new BadRequestException('handle is required for creators');

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email is already registered');
    if (dto.handle) {
      const taken = await this.prisma.creatorProfile.findUnique({ where: { handle: dto.handle } });
      if (taken) throw new ConflictException('Handle is already taken');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        displayName: dto.displayName,
        role,
        emailVerifiedAt: this.cfg.requireEmailVerification ? null : new Date(),
        ...(role === Role.CREATOR
          ? { creatorProfile: { create: { handle: dto.handle!, status: this.cfg.creatorAutoApprove ? CreatorStatus.APPROVED : CreatorStatus.PENDING } } }
          : {}),
      },
    });

    if (this.cfg.requireEmailVerification) {
      // No session until the address is verified.
      await this.sendVerification(user);
      return { user: this.publicUser(user), emailVerificationRequired: true as const };
    }

    const tokens = await this.issueTokens(user);
    return { user: this.publicUser(user), ...tokens, emailVerificationRequired: false as const };
  }

  async login(dto: LoginDto, userAgent?: string) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    // Compare against a dummy hash when the user does not exist to keep timing uniform.
    const ok = await bcrypt.compare(dto.password, user?.passwordHash ?? '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv');
    if (!user || !ok) throw new UnauthorizedException('Invalid email or password');
    if (user.status !== UserStatus.ACTIVE) throw new ForbiddenException('Account is not active');
    if (this.cfg.requireEmailVerification && !user.emailVerifiedAt) throw new ForbiddenException('Please verify your email first');
    const tokens = await this.issueTokens(user, undefined, userAgent);
    return { user: this.publicUser(user), ...tokens };
  }

  async refresh(refreshToken: string, userAgent?: string): Promise<TokenPair> {
    const record = await this.prisma.refreshToken.findUnique({ where: { tokenHash: sha256(refreshToken) }, include: { user: true } });
    if (!record) throw new UnauthorizedException('Invalid refresh token');
    if (record.revokedAt) {
      // Reuse of a rotated token: assume theft and revoke the whole family.
      await this.prisma.refreshToken.updateMany({ where: { familyId: record.familyId, revokedAt: null }, data: { revokedAt: new Date() } });
      throw new UnauthorizedException('Refresh token reuse detected');
    }
    if (record.expiresAt < new Date() || record.user.status !== UserStatus.ACTIVE) throw new UnauthorizedException('Refresh token expired');
    await this.prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } });
    return this.issueTokens(record.user, record.familyId, userAgent);
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.updateMany({ where: { tokenHash: sha256(refreshToken), revokedAt: null }, data: { revokedAt: new Date() } });
    return { success: true };
  }

  async verifyEmail(token: string) {
    const rec = await this.consumeToken(token, TokenPurpose.EMAIL_VERIFICATION);
    await this.prisma.user.update({ where: { id: rec.userId }, data: { emailVerifiedAt: new Date() } });
    return { success: true };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (user && user.status === UserStatus.ACTIVE) {
      const token = await this.createToken(user.id, TokenPurpose.PASSWORD_RESET, 1 / 24);
      await this.mail.send(user.email, 'Reset your Reccora password', `Use this code to reset your password: ${token}`);
    }
    // Always succeed to avoid account enumeration.
    return { success: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const rec = await this.consumeToken(dto.token, TokenPurpose.PASSWORD_RESET);
    const passwordHash = await bcrypt.hash(dto.password, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: rec.userId }, data: { passwordHash } }),
      this.prisma.refreshToken.updateMany({ where: { userId: rec.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    return { success: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { creatorProfile: true } });
    return { ...this.publicUser(user), creatorProfile: user.creatorProfile };
  }

  publicUser(u: User) {
    return { id: u.id, email: u.email, displayName: u.displayName, role: u.role, avatarUrl: u.avatarUrl, emailVerified: !!u.emailVerifiedAt };
  }

  private async issueTokens(user: User, familyId?: string, userAgent?: string): Promise<TokenPair> {
    const accessToken = await this.jwt.signAsync({ sub: user.id, role: user.role });
    const refreshToken = randomBytes(48).toString('hex');
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(refreshToken),
        familyId: familyId ?? randomUUID(),
        expiresAt: new Date(Date.now() + this.cfg.jwt.refreshTtlDays * DAY),
        userAgent: userAgent?.slice(0, 255),
      },
    });
    return { accessToken, refreshToken };
  }

  private async sendVerification(user: User) {
    const token = await this.createToken(user.id, TokenPurpose.EMAIL_VERIFICATION, 2);
    await this.mail.send(user.email, 'Verify your Reccora email', `Your verification code: ${token}`);
  }

  private async createToken(userId: string, purpose: TokenPurpose, ttlDays: number) {
    const token = randomBytes(24).toString('hex');
    await this.prisma.verificationToken.create({
      data: { userId, purpose, tokenHash: sha256(token), expiresAt: new Date(Date.now() + ttlDays * DAY) },
    });
    return token;
  }

  private async consumeToken(token: string, purpose: TokenPurpose) {
    const rec = await this.prisma.verificationToken.findUnique({ where: { tokenHash: sha256(token) } });
    if (!rec || rec.purpose !== purpose || rec.usedAt || rec.expiresAt < new Date()) throw new BadRequestException('Invalid or expired token');
    await this.prisma.verificationToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } });
    return rec;
  }
}
