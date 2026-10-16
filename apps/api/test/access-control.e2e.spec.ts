/**
 * HTTP-level checks of authentication, role and routing rules using the real Nest app
 * (guards, pipes, filters, versioning) with Prisma replaced by an in-memory mock.
 */
process.env.DATABASE_URL = 'postgresql://x:x@localhost:5432/x';
process.env.JWT_ACCESS_SECRET = 'a'.repeat(40);
process.env.JWT_REFRESH_SECRET = 'b'.repeat(40);
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';

import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { createPrismaMock } from './prisma-mock';

describe('Access control (HTTP)', () => {
  let app: INestApplication;
  let prisma: any;
  let jwt: JwtService;
  const users: Record<string, any> = {
    admin: { id: 'admin1', email: 'a@x.co', role: 'ADMIN', status: 'ACTIVE' },
    creator: { id: 'creator1', email: 'c@x.co', role: 'CREATOR', status: 'ACTIVE' },
    shopper: { id: 'shopper1', email: 's@x.co', role: 'SHOPPER', status: 'ACTIVE' },
    suspended: { id: 'sus1', email: 'z@x.co', role: 'ADMIN', status: 'SUSPENDED' },
  };
  const token = (u: any) => jwt.sign({ sub: u.id, role: u.role });
  const as = (name: string) => `Bearer ${token(users[name])}`;

  beforeAll(async () => {
    prisma = createPrismaMock();
    const mod = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(PrismaService).useValue(prisma).compile();
    app = mod.createNestApplication({ rawBody: true });
    app.setGlobalPrefix('api', { exclude: ['c/:handle'] });
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    jwt = app.get(JwtService);
  });
  afterAll(() => app.close());

  beforeEach(() => {
    prisma.user.findUnique.mockImplementation(async ({ where }: any) => Object.values(users).find((u) => u.id === where.id) ?? null);
  });

  const adminRoutes: [string, string][] = [
    ['get', '/admin/overview'], ['get', '/admin/users'], ['get', '/admin/creators'], ['get', '/admin/products'], ['post', '/admin/products'],
    ['get', '/admin/categories'], ['post', '/admin/categories'], ['get', '/admin/brands'], ['get', '/admin/conversions'], ['get', '/admin/commissions'],
    ['get', '/admin/commission-rules'], ['get', '/admin/payouts'], ['post', '/admin/payouts'], ['get', '/admin/reports'], ['get', '/admin/clicks'],
    ['patch', '/admin/creators/11111111-1111-1111-1111-111111111111/status'], ['post', '/admin/conversions/import'],
  ];

  describe.each(adminRoutes)('%s /api/v1%s', (method, path) => {
    const url = `/api/v1${path}`;
    it('401 without a token', () => (request(app.getHttpServer()) as any)[method](url).expect(401));
    it('403 for shoppers', () => (request(app.getHttpServer()) as any)[method](url).set('Authorization', as('shopper')).expect(403));
    it('403 for creators', () => (request(app.getHttpServer()) as any)[method](url).set('Authorization', as('creator')).expect(403));
    it('401 for suspended admins', () => (request(app.getHttpServer()) as any)[method](url).set('Authorization', as('suspended')).expect(401));
  });

  it('admins pass the guard (validation errors, not 401/403)', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/admin/products').set('Authorization', as('admin')).send({});
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ statusCode: 400, message: 'Validation failed' });
  });

  it('rejects forged tokens', async () => {
    const forged = new JwtService({ secret: 'z'.repeat(40) }).sign({ sub: 'admin1', role: 'ADMIN' });
    await request(app.getHttpServer()).get('/api/v1/admin/overview').set('Authorization', `Bearer ${forged}`).expect(401);
  });

  it('uses the database role, not the token claim', async () => {
    const claimsAdmin = jwt.sign({ sub: 'shopper1', role: 'ADMIN' });
    await request(app.getHttpServer()).get('/api/v1/admin/overview').set('Authorization', `Bearer ${claimsAdmin}`).expect(403);
  });

  describe('creator-only routes', () => {
    it('shoppers cannot publish posts or create collections', async () => {
      await request(app.getHttpServer()).post('/api/v1/posts').set('Authorization', as('shopper')).send({}).expect(403);
      await request(app.getHttpServer()).post('/api/v1/collections').set('Authorization', as('shopper')).send({}).expect(403);
      await request(app.getHttpServer()).get('/api/v1/creators/me/analytics').set('Authorization', as('shopper')).expect(403);
    });
    it('anonymous users get 401', async () => {
      await request(app.getHttpServer()).post('/api/v1/posts').send({}).expect(401);
    });
  });

  describe('shopper routes require authentication', () => {
    it.each([['get', '/saved/products'], ['put', '/saved/products/11111111-1111-1111-1111-111111111111'], ['get', '/me/following'], ['get', '/notifications'], ['get', '/users/me'], ['post', '/uploads']])(
      '%s %s -> 401', (m, p) => (request(app.getHttpServer()) as any)[m](`/api/v1${p}`).expect(401),
    );
  });

  describe('public routes', () => {
    it('product list works anonymously', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);
      const res = await request(app.getHttpServer()).get('/api/v1/products?limit=5').expect(200);
      expect(res.body.meta).toMatchObject({ total: 0, page: 1, limit: 5 });
    });
    it('validates query params', async () => {
      await request(app.getHttpServer()).get('/api/v1/products?limit=9999').expect(400);
      await request(app.getHttpServer()).get('/api/v1/products?sort=hax').expect(400);
    });
    it('unknown creator storefront is 404 with the standard error envelope', async () => {
      prisma.creatorProfile.findFirst.mockResolvedValue(null);
      const res = await request(app.getHttpServer()).get('/api/v1/creators/ghost/storefront').expect(404);
      expect(res.body).toMatchObject({ statusCode: 404, error: 'NOT_FOUND', path: expect.any(String) });
    });
    it('optional auth does not break with a bad token on public routes', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);
      await request(app.getHttpServer()).get('/api/v1/products').set('Authorization', 'Bearer garbage').expect(200);
    });
  });

  describe('public storefront page', () => {
    it('renders escaped HTML with tracked buy links', async () => {
      prisma.creatorProfile.findFirst.mockResolvedValueOnce({ id: 'c1', handle: 'maya', bio: '<script>alert(1)</script>', avatarUrl: 'javascript:alert(1)', coverUrl: null, followerCount: 3, status: 'APPROVED', user: { displayName: 'Maya "M"' } });
      prisma.creatorProfile.findFirst.mockResolvedValueOnce(null);
      prisma.storefrontProduct.findMany.mockResolvedValue([{ productId: 'p1', product: { id: 'p1', title: 'Shoe <b>', slug: 's', description: null, price: '10', currency: 'USD', merchantName: 'Shop', brand: null, category: null, images: [{ id: 'i', url: 'https://img.test/a.jpg', alt: null }], links: [{ id: 'l' }], saveCount: 0 } }]);
      prisma.post.findMany.mockResolvedValue([]);
      prisma.collection.findMany.mockResolvedValue([]);
      const res = await request(app.getHttpServer()).get('/c/maya').expect(200);
      expect(res.headers['content-type']).toMatch(/text\/html/);
      expect(res.headers['content-security-policy']).toContain("default-src 'none'");
      expect(res.text).not.toContain('<script>alert');
      expect(res.text).not.toContain('javascript:');
      expect(res.text).toContain('Shoe &lt;b&gt;');
      expect(res.text).toContain('/api/v1/go/p1?creator=maya&amp;source=web');
    });
    it('404s for unknown creators', async () => {
      prisma.creatorProfile.findFirst.mockResolvedValue(null);
      await request(app.getHttpServer()).get('/c/ghost').expect(404);
    });
  });

  describe('tracking', () => {
    it('click redirect 404s when the product has no approved link, without recording', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: 'p', links: [] });
      await request(app.getHttpServer()).get('/api/v1/go/11111111-1111-1111-1111-111111111111').expect(404);
      expect(prisma.productClick.create).not.toHaveBeenCalled();
    });
    it('click redirect records the click and 302s to the merchant', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: 'p', links: [{ id: 'l', url: 'https://merchant.test/item', affiliateProvider: null }] });
      prisma.productClick.create.mockResolvedValue({});
      const res = await request(app.getHttpServer()).get('/api/v1/go/11111111-1111-1111-1111-111111111111').redirects(0).expect(302);
      expect(res.headers.location).toBe('https://merchant.test/item');
      expect(prisma.productClick.create).toHaveBeenCalledTimes(1);
    });
    it('affiliate callback without a valid signature is rejected and records nothing', async () => {
      await request(app.getHttpServer()).post('/api/v1/affiliate/generic/callback').send({ events: [{ id: '1', status: 'confirmed', amount: 99999 }] }).expect(404);
      await request(app.getHttpServer()).post('/api/v1/affiliate/unknown/callback').set('x-reccora-signature', 'aa').send({}).expect(404);
      expect(prisma.affiliateConversion.create).not.toHaveBeenCalled();
    });
  });

  it('login rate limit eventually returns 429', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const codes: number[] = [];
    for (let i = 0; i < 12; i++) {
      codes.push((await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: 'x@y.co', password: 'nope' })).status);
    }
    expect(codes).toContain(401);
    expect(codes).toContain(429);
  });
});
