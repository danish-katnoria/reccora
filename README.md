# Reccora — Discover what creators love

Creator-led shopping: discover products through creator recommendations, browse storefronts, save products and buy on the merchant's own site (there is no internal checkout).

| App | Path | Stack | Default port |
| --- | --- | --- | --- |
| API | `apps/api` | NestJS 11, Prisma, PostgreSQL | 3000 (`/api/v1`, Swagger at `/docs`) |
| Shopper web | `apps/web` | Next.js 15 (App Router), Tailwind 4 | 3002 |
| Admin dashboard | `apps/admin` | Next.js 15 | 3001 |
| Mobile | `apps/mobile` | Expo SDK 57, React Native, Expo Router | Expo dev server |

All clients use the same API and database. The web apps call the API through a same-origin proxy (httpOnly session cookies); the mobile app talks to it directly with a bearer token + refresh token.

## Run locally

```bash
# 1. Database (+ MinIO, optional) — or point DATABASE_URL at any Postgres
docker compose up -d postgres

# 2. API
cd apps/api
cp .env.example .env            # STORAGE_DRIVER=local stores uploads on disk, so MinIO isn't required
npm install
npx prisma migrate deploy
npm run seed                    # idempotent demo data: 31 products, 5 creators, collections, posts
npm run start:dev

# 3. Shopper web  (http://localhost:3002)
cd apps/web && cp .env.example .env.local && npm install && npm run dev

# 4. Mobile
cd apps/mobile && npm install && npx expo start --android
```

Demo logins (password `Password123!`): `shopper@reccora.test`, creators `maya@`, `leo@`, `ana@`, `theo@`, `jordan@reccora.test`, admin `admin@reccora.test`.

### Networking notes
- **Android emulator** reaches the host at `10.0.2.2`; `apps/mobile/.env` already points there. A physical device needs your LAN IP in `EXPO_PUBLIC_API_URL`.
- With `STORAGE_DRIVER=local`, uploaded media URLs are built from `API_PUBLIC_URL` and served from `/uploads`. The mobile client rewrites loopback hosts in API responses to the host it uses for the API, so uploads made on the web render on a device too. For a physical device, set `API_PUBLIC_URL` to your LAN IP.
- `PUBLIC_WEB_URL` (API) must be the shopper web origin; shareable storefront links are `<PUBLIC_WEB_URL>/c/<handle>`.
- Web env: `API_URL` (server → API) and `API_PUBLIC_URL` (browser-visible API origin for the "Shop Product" redirect).

## Checks
```bash
cd apps/api    && npm run typecheck && npm run lint && npm test
cd apps/web    && npm run typecheck && npm run lint && npm run build
cd apps/mobile && npm run typecheck && npm run lint && npm test
```
