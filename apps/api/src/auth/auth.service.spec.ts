import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { createPrismaMock } from '../../test/prisma-mock';
import { AuthService } from './auth.service';

const cfg = { jwt: { refreshTtlDays: 30 }, requireEmailVerification: false, creatorAutoApprove: true };

describe('AuthService', () => {
  let prisma: any;
  let svc: AuthService;
  const jwt = { signAsync: jest.fn().mockResolvedValue('access.jwt') };
  const mail = { send: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createPrismaMock();
    svc = new AuthService(prisma, jwt as any, { get: () => cfg } as any, mail as any);
    prisma.refreshToken.create.mockResolvedValue({});
    prisma.user.create.mockImplementation(async ({ data }: any) => ({ id: 'u1', status: 'ACTIVE', avatarUrl: null, emailVerifiedAt: data.emailVerifiedAt, ...data, creatorProfile: undefined }));
  });

  describe('register', () => {
    it('creates a shopper with a hashed password and returns tokens', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const res: any = await svc.register({ email: 'a@b.co', password: 'password123', displayName: 'Ann' });
      const data = prisma.user.create.mock.calls[0][0].data;
      expect(data.role).toBe('SHOPPER');
      expect(data.passwordHash).not.toContain('password123');
      expect(await bcrypt.compare('password123', data.passwordHash)).toBe(true);
      expect(res.accessToken).toBe('access.jwt');
      expect(res.refreshToken).toHaveLength(96);
      expect(res.user).not.toHaveProperty('passwordHash');
    });

    it('creates a creator profile for creators and requires a handle', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.creatorProfile.findUnique.mockResolvedValue(null);
      await expect(svc.register({ email: 'a@b.co', password: 'password123', displayName: 'Ann', role: 'CREATOR' })).rejects.toThrow('handle is required');
      await svc.register({ email: 'a@b.co', password: 'password123', displayName: 'Ann', role: 'CREATOR', handle: 'ann_x' });
      expect(prisma.user.create.mock.calls[0][0].data.creatorProfile.create).toMatchObject({ handle: 'ann_x', status: 'APPROVED' });
    });

    it('issues no session and sends a code when email verification is required', async () => {
      const verifying = new AuthService(prisma, jwt as any, { get: () => ({ ...cfg, requireEmailVerification: true }) } as any, mail as any);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.verificationToken.create.mockResolvedValue({});
      const res: any = await verifying.register({ email: 'a@b.co', password: 'password123', displayName: 'Ann' });
      expect(res.emailVerificationRequired).toBe(true);
      expect(res.accessToken).toBeUndefined();
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
      expect(prisma.user.create.mock.calls[0][0].data.emailVerifiedAt).toBeNull();
      expect(mail.send).toHaveBeenCalledWith('a@b.co', expect.any(String), expect.stringContaining('verification code'));
    });

    it('never lets a client self-assign ADMIN', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await svc.register({ email: 'a@b.co', password: 'password123', displayName: 'Ann', role: 'ADMIN' as any });
      expect(prisma.user.create.mock.calls[0][0].data.role).toBe('SHOPPER');
    });

    it('rejects duplicate email and duplicate handle', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'x' });
      await expect(svc.register({ email: 'a@b.co', password: 'password123', displayName: 'Ann' })).rejects.toBeInstanceOf(ConflictException);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.creatorProfile.findUnique.mockResolvedValue({ id: 'c' });
      await expect(svc.register({ email: 'a@b.co', password: 'password123', displayName: 'Ann', role: 'CREATOR', handle: 'taken' })).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('login', () => {
    it('succeeds with correct credentials', async () => {
      const passwordHash = await bcrypt.hash('password123', 4);
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.co', passwordHash, status: 'ACTIVE', role: 'SHOPPER', displayName: 'A' });
      const res = await svc.login({ email: 'a@b.co', password: 'password123' });
      expect(res.accessToken).toBeDefined();
    });
    it('gives the same error for wrong password and unknown email', async () => {
      const passwordHash = await bcrypt.hash('password123', 4);
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', passwordHash, status: 'ACTIVE' });
      await expect(svc.login({ email: 'a@b.co', password: 'bad' })).rejects.toThrow('Invalid email or password');
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(svc.login({ email: 'no@b.co', password: 'bad' })).rejects.toThrow('Invalid email or password');
    });
    it('blocks suspended accounts', async () => {
      const passwordHash = await bcrypt.hash('password123', 4);
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', passwordHash, status: 'SUSPENDED' });
      await expect(svc.login({ email: 'a@b.co', password: 'password123' })).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('refresh', () => {
    it('rotates a valid token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({ id: 'r1', familyId: 'f1', revokedAt: null, expiresAt: new Date(Date.now() + 1e6), user: { id: 'u1', status: 'ACTIVE', role: 'SHOPPER' } });
      const res = await svc.refresh('tok');
      expect(prisma.refreshToken.update).toHaveBeenCalledWith({ where: { id: 'r1' }, data: { revokedAt: expect.any(Date) } });
      expect(prisma.refreshToken.create.mock.calls[0][0].data.familyId).toBe('f1');
      expect(res.refreshToken).not.toBe('tok');
    });
    it('revokes the whole family when a rotated token is reused', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({ id: 'r1', familyId: 'f1', revokedAt: new Date(), expiresAt: new Date(Date.now() + 1e6), user: { status: 'ACTIVE' } });
      await expect(svc.refresh('tok')).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({ where: { familyId: 'f1', revokedAt: null }, data: { revokedAt: expect.any(Date) } });
    });
    it('rejects unknown and expired tokens', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);
      await expect(svc.refresh('x')).rejects.toBeInstanceOf(UnauthorizedException);
      prisma.refreshToken.findUnique.mockResolvedValue({ id: 'r1', revokedAt: null, expiresAt: new Date(Date.now() - 1000), user: { status: 'ACTIVE' } });
      await expect(svc.refresh('x')).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('password reset', () => {
    it('does not reveal whether an email exists', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(svc.forgotPassword({ email: 'ghost@b.co' })).resolves.toEqual({ success: true });
      expect(mail.send).not.toHaveBeenCalled();
    });
    it('rejects used/expired/wrong-purpose tokens', async () => {
      prisma.verificationToken.findUnique.mockResolvedValue({ id: 't', purpose: 'PASSWORD_RESET', usedAt: new Date(), expiresAt: new Date(Date.now() + 1e6) });
      await expect(svc.resetPassword({ token: 'x', password: 'newpassword1' })).rejects.toThrow('Invalid or expired');
      prisma.verificationToken.findUnique.mockResolvedValue({ id: 't', purpose: 'EMAIL_VERIFICATION', usedAt: null, expiresAt: new Date(Date.now() + 1e6) });
      await expect(svc.resetPassword({ token: 'x', password: 'newpassword1' })).rejects.toThrow('Invalid or expired');
    });
    it('sets the new password and revokes sessions', async () => {
      prisma.verificationToken.findUnique.mockResolvedValue({ id: 't', userId: 'u1', purpose: 'PASSWORD_RESET', usedAt: null, expiresAt: new Date(Date.now() + 1e6) });
      await svc.resetPassword({ token: 'x', password: 'newpassword1' });
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({ where: { userId: 'u1', revokedAt: null }, data: { revokedAt: expect.any(Date) } });
    });
  });
});
