/*
 * Development seed data (idempotent: safe to run repeatedly).
 * Images are curated Unsplash photographs matched to each product/creator; merchant links point at example.com.
 */
import { PrismaClient, Role, CreatorStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const photo = (id: string, w = 1000, h?: number) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}${h ? `&h=${h}` : ''}&q=80`;

// Photo ids (verified). Grouped so every product gets related-but-distinct gallery images.
const P = {
  knitPoncho: '1434389677669-e08b4cac3105', greenTees: '1523381210434-271e8be1f52b', whiteSweater: '1620799140408-edc6dcb6d633',
  chambray: '1596755094514-f87e34085b2c', crossbody: '1548036328-c9fa89d128fa', sunglasses: '1572635196237-14b3f281503f',
  palette: '1512496015851-a90fb38ba796', glowKit: '1522335789203-aabd1fc54bc9', brushes: '1596462502278-27bfdc403348',
  serumSet: '1571781926291-c477ebfd024b', tube: '1556228720-195a672e8a03', clayMask: '1570172619644-dfd03ed5d881',
  armchair: '1586023492125-27b2c045efd7', sofa: '1493663284031-b7e3aefcae8e', armoire: '1558997519-83ea9252edf8',
  kitchen: '1556911220-bff31c812dba', coffee: '1495474472287-4d71bcdd2085', bath: '1507652313519-d4e9174996dd',
  headphones: '1505740420928-5e560c06d30e', keyboard: '1587829741301-dc798b83add3', laptop: '1588872657578-7efd1f1555ed',
  phone: '1511707171634-5f897ff02aa9', watch: '1523275335684-37898b6baf30',
  shoes: '1542291026-7eec264c27ff', dumbbells: '1534438327276-14e5300c3a48', barbell: '1517836357463-d25dfeac3438',
  bottle: '1602143407151-7111542de6e8', workout: '1571019613454-1cb2f99b2d8b',
  suitcase: '1565026057447-bc90a3dceb87', backpack: '1553062407-98eeb64c6a62', travelKit: '1488646953014-85cb44e25828',
  portraitMaya: '1494790108377-be9c29b29330', portraitLeo: '1507003211169-0a1dd7228f2d', portraitAna: '1438761681033-6461ffad8d80',
  portraitTheo: '1500648767791-00dcc994a43e', portraitJordan: '1531427186611-ecfd6d936c79',
} as const;

interface ProductDef { title: string; cat: string; price: number; merchant: string; brand: number; description: string; images: string[] }

const products: ProductDef[] = [
  // Fashion
  { title: 'Merino Crew Sweater', cat: 'fashion', price: 89, merchant: 'Northwind Store', brand: 0, description: 'A soft, breathable merino-blend crew with a relaxed drape. Layers easily from first frost to spring and washes beautifully.', images: [P.whiteSweater, P.greenTees] },
  { title: 'Hand-Knit Cotton Poncho', cat: 'fashion', price: 74, merchant: 'Oak & Ember Shop', brand: 1, description: 'A lightweight open-knit poncho with a fringed hem. Throw it over a tee for an effortless, textured finish.', images: [P.knitPoncho, P.whiteSweater] },
  { title: 'Chambray Button-Up Shirt', cat: 'fashion', price: 64, merchant: 'Northwind Store', brand: 0, description: 'Soft-washed chambray with a subtle dot print. Wear it buttoned up, open over a tee, or tucked into high-rise denim.', images: [P.chambray, P.greenTees] },
  { title: 'Quilted Crossbody Bag', cat: 'fashion', price: 148, merchant: 'Oak & Ember Shop', brand: 1, description: 'A structured, chain-strap crossbody in quilted leather with a magnetic closure. Fits phone, cards, and lip balm.', images: [P.crossbody, P.sunglasses] },
  { title: 'Classic Wayfarer Sunglasses', cat: 'fashion', price: 59, merchant: 'Stride Outlet', brand: 3, description: 'Timeless acetate frames with UV400 lenses. The one pair that works with absolutely everything.', images: [P.sunglasses, P.crossbody] },
  { title: 'Organic Cotton Essentials Tee 3-Pack', cat: 'fashion', price: 52, merchant: 'Northwind Store', brand: 0, description: 'Three heavyweight organic cotton tees in earthy sage. Boxy fit, pre-washed, built to last.', images: [P.greenTees, P.chambray] },
  // Beauty
  { title: 'Barrier Repair Serum Set', cat: 'beauty', price: 46, merchant: 'Lumen Direct', brand: 2, description: 'A three-step routine with a gentle cleanser, balancing serum and moisturiser. Dermatologist-tested and fragrance-free.', images: [P.serumSet, P.tube] },
  { title: 'Daily Mineral Sunscreen SPF 50', cat: 'beauty', price: 24, merchant: 'Lumen Direct', brand: 2, description: 'Sheer, reef-safe mineral sunscreen that leaves no white cast. Wears well under makeup.', images: [P.tube, P.serumSet] },
  { title: 'Nude Eyeshadow & Bronzer Palette', cat: 'beauty', price: 38, merchant: 'Lumen Direct', brand: 2, description: 'Twelve buttery shades from soft matte neutrals to a shimmering bronzer, all in one slim compact.', images: [P.palette, P.glowKit, P.brushes] },
  { title: 'Rose-Gold Brush & Glow Set', cat: 'beauty', price: 56, merchant: 'Lumen Direct', brand: 2, description: 'Soft synthetic brushes, a luminous powder and everything you need for a quick, polished face.', images: [P.brushes, P.palette] },
  { title: 'Detox Clay Facial Mask', cat: 'beauty', price: 29, merchant: 'Oak & Ember Shop', brand: 1, description: 'A mineral-rich clay mask that deep-cleans without stripping. Ten minutes and you are glowing.', images: [P.clayMask, P.serumSet] },
  { title: 'Marble Glow Complexion Kit', cat: 'beauty', price: 62, merchant: 'Northwind Store', brand: 0, description: 'Blush, bronzer and highlighter in one curated edit, designed to build a natural, lit-from-within finish.', images: [P.glowKit, P.brushes] },
  // Home
  { title: 'Mustard Mid-Century Armchair', cat: 'home', price: 329, merchant: 'Oak & Ember Shop', brand: 1, description: 'A sculpted accent chair with solid oak legs and a sunny velvet seat. The easiest way to bring colour into a neutral room.', images: [P.armchair, P.sofa] },
  { title: 'Tufted Linen Sofa', cat: 'home', price: 899, merchant: 'Oak & Ember Shop', brand: 1, description: 'Deep seats, button-tufted back and removable linen covers. Comfortable for movie nights, polished for guests.', images: [P.sofa, P.armchair] },
  { title: 'Walnut Storage Armoire', cat: 'home', price: 540, merchant: 'Northwind Store', brand: 0, description: 'Warm walnut veneer with soft-close doors and an adjustable interior. Hides clutter, shows off craftsmanship.', images: [P.armoire, P.armchair] },
  { title: 'Chef’s Enamel Cookware Set', cat: 'home', price: 245, merchant: 'Northwind Store', brand: 0, description: 'Cast-iron cookware in glossy enamel that goes from the stovetop to the table. Even heat, decades of use.', images: [P.kitchen, P.coffee] },
  { title: 'Specialty Coffee Starter Kit', cat: 'home', price: 58, merchant: 'Oak & Ember Shop', brand: 1, description: 'Single-origin beans, a ceramic pour-over dripper and a tasting guide. Cafe-quality mornings at home.', images: [P.coffee, P.kitchen] },
  { title: 'Sculpted Stone Soaking Tub', cat: 'home', price: 1450, merchant: 'Northwind Store', brand: 0, description: 'A freestanding, softly curved bath in matte stone resin. The centrepiece of a calm bathroom.', images: [P.bath, P.armoire] },
  // Tech
  { title: 'Studio Wireless Headphones', cat: 'tech', price: 179, merchant: 'Lumen Direct', brand: 2, description: 'Over-ear headphones with adaptive noise cancelling, rich bass and 40-hour battery life.', images: [P.headphones, P.phone] },
  { title: 'Slim Wireless Keyboard', cat: 'tech', price: 99, merchant: 'Lumen Direct', brand: 2, description: 'Low-profile keys, multi-device Bluetooth and a rechargeable battery that lasts for months.', images: [P.keyboard, P.laptop] },
  { title: 'Ultrabook 14″ Pro', cat: 'tech', price: 1099, merchant: 'Lumen Direct', brand: 2, description: 'A light 14-inch laptop with a crisp display, all-day battery and a quiet, fast processor.', images: [P.laptop, P.keyboard] },
  { title: 'Edge Display Smartphone', cat: 'tech', price: 799, merchant: 'Lumen Direct', brand: 2, description: 'Edge-to-edge OLED, a pro-grade camera system and two-day battery life.', images: [P.phone, P.headphones] },
  { title: 'Minimal Smartwatch', cat: 'tech', price: 229, merchant: 'Stride Outlet', brand: 3, description: 'A clean, always-on display with sleep, heart-rate and workout tracking. Interchangeable silicone straps.', images: [P.watch, P.phone] },
  // Fitness
  { title: 'Flyknit Running Shoes', cat: 'fitness', price: 135, merchant: 'Stride Outlet', brand: 3, description: 'Sock-like knit upper with responsive cushioning. Built for tempo runs and long Sundays.', images: [P.shoes, P.workout] },
  { title: 'Rubber Hex Dumbbell Set', cat: 'fitness', price: 320, merchant: 'Stride Outlet', brand: 3, description: 'Knurled steel handles and chip-resistant rubber heads. Build a proper home gym one pair at a time.', images: [P.dumbbells, P.barbell] },
  { title: 'Olympic Barbell & Plates Bundle', cat: 'fitness', price: 410, merchant: 'Stride Outlet', brand: 3, description: 'A 20kg bar and bumper plates for squats, deadlifts and presses with serious grip.', images: [P.barbell, P.dumbbells] },
  { title: 'Insulated Steel Water Bottle', cat: 'fitness', price: 31, merchant: 'Stride Outlet', brand: 3, description: 'Double-wall vacuum insulation keeps drinks cold for 24 hours. Matte sage powder coat.', images: [P.bottle, P.workout] },
  { title: 'High-Rise Training Leggings', cat: 'fitness', price: 78, merchant: 'Northwind Store', brand: 0, description: 'Sculpting, sweat-wicking and squat-proof. Deep pockets keep your phone secure mid-workout.', images: [P.workout, P.shoes] },
  // Travel
  { title: 'Hardshell Spinner Carry-On', cat: 'travel', price: 189, merchant: 'Stride Outlet', brand: 3, description: 'Scratch-resistant polycarbonate shell, silent 360° wheels and a TSA lock. Fits every overhead bin.', images: [P.suitcase, P.backpack] },
  { title: 'Everyday Travel Daypack', cat: 'travel', price: 82, merchant: 'Northwind Store', brand: 0, description: 'A water-resistant 22L pack with a padded laptop sleeve and hidden passport pocket.', images: [P.backpack, P.travelKit] },
  { title: 'Explorer Field Notes & Camera Kit', cat: 'travel', price: 215, merchant: 'Oak & Ember Shop', brand: 1, description: 'Notebook, map case and camera strap bundle for slow, curious travel.', images: [P.travelKit, P.backpack] },
];

const creatorDefs = [
  { email: 'maya@reccora.test', name: 'Maya Chen', handle: 'mayastyle', bio: 'Everyday fashion, capsule wardrobes and a soft spot for good skincare.', avatar: P.portraitMaya, cover: P.greenTees, cats: ['fashion', 'beauty'], followers: 4 },
  { email: 'leo@reccora.test', name: 'Leo Martins', handle: 'leotech', bio: 'Gadgets I actually use. No fluff, no sponsored hype.', avatar: P.portraitLeo, cover: P.laptop, cats: ['tech'], followers: 3 },
  { email: 'ana@reccora.test', name: 'Ana Rossi', handle: 'anahome', bio: 'Small-space living and slow home design.', avatar: P.portraitAna, cover: P.sofa, cats: ['home'], followers: 3 },
  { email: 'theo@reccora.test', name: 'Theo Walker', handle: 'theomoves', bio: 'Strength coach. Honest gear reviews for people who actually train.', avatar: P.portraitTheo, cover: P.dumbbells, cats: ['fitness'], followers: 2 },
  { email: 'jordan@reccora.test', name: 'Jordan Lee', handle: 'jordanwanders', bio: 'Carry-on only. Slow travel, great luggage, fewer things.', avatar: P.portraitJordan, cover: P.suitcase, cats: ['travel', 'tech'], followers: 1 },
];

const captions: Record<string, string[]> = {
  fashion: ['My go-to layer all season', 'Styled three ways this week', 'Worth every penny', 'The piece I keep reaching for'],
  beauty: ['My five-minute routine', 'Skin has never looked better', 'Currently obsessed', 'Swipe for the before and after'],
  home: ['This changed my living room', 'Small space, big impact', 'Slow design at its best', 'Quietly the best purchase this year'],
  tech: ['Daily driver for two months', 'The setup that finally clicked', 'Honest review: it is that good', 'Cleaned up my desk with this'],
  fitness: ['Programming staple', 'Tested for 12 weeks', 'Gear I actually use', 'Never skip leg day without it'],
  travel: ['Packed for ten days in one bag', 'The only luggage I trust', 'Airport-tested and approved', 'Pack light, explore more'],
};

const collectionDefs: Record<string, { title: string; slug: string; description: string; cover: string; titles: string[] }[]> = {
  mayastyle: [
    { title: 'Autumn Capsule', slug: 'autumn-capsule', description: 'Twelve pieces that build a season of outfits.', cover: P.whiteSweater, titles: ['Merino Crew Sweater', 'Hand-Knit Cotton Poncho', 'Chambray Button-Up Shirt', 'Quilted Crossbody Bag'] },
    { title: 'Glow Routine', slug: 'glow-routine', description: 'My everyday skin and makeup edit.', cover: P.palette, titles: ['Barrier Repair Serum Set', 'Daily Mineral Sunscreen SPF 50', 'Nude Eyeshadow & Bronzer Palette', 'Marble Glow Complexion Kit'] },
  ],
  leotech: [{ title: 'Desk Setup 2026', slug: 'desk-setup', description: 'Everything on my desk, and why.', cover: P.keyboard, titles: ['Slim Wireless Keyboard', 'Ultrabook 14″ Pro', 'Studio Wireless Headphones', 'Minimal Smartwatch'] }],
  anahome: [{ title: 'Cozy Living Room', slug: 'cozy-living-room', description: 'Warm woods, soft textures and a pop of mustard.', cover: P.armchair, titles: ['Mustard Mid-Century Armchair', 'Tufted Linen Sofa', 'Walnut Storage Armoire', 'Specialty Coffee Starter Kit'] }],
  theomoves: [{ title: 'Home Gym Essentials', slug: 'home-gym', description: 'Everything you need and nothing you do not.', cover: P.barbell, titles: ['Rubber Hex Dumbbell Set', 'Olympic Barbell & Plates Bundle', 'Flyknit Running Shoes', 'Insulated Steel Water Bottle'] }],
  jordanwanders: [{ title: 'Carry-On Only', slug: 'carry-on-only', description: 'Ten days, one bag.', cover: P.backpack, titles: ['Hardshell Spinner Carry-On', 'Everyday Travel Daypack', 'Explorer Field Notes & Camera Kit', 'Minimal Smartwatch'] }],
};

const slugOf = (title: string) => `seed-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')}`;

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Refusing to seed demo data in production');
  const password = process.env.SEED_PASSWORD ?? 'Password123!';
  const passwordHash = await bcrypt.hash(password, 10);

  // Categories
  const catNames = ['Fashion', 'Beauty', 'Home', 'Tech', 'Fitness', 'Travel'];
  const cats: Record<string, string> = {};
  for (const [i, name] of catNames.entries()) {
    const slug = name.toLowerCase();
    const c = await prisma.category.upsert({ where: { slug }, update: { sortOrder: i }, create: { name, slug, sortOrder: i } });
    cats[slug] = c.id;
  }

  // Brands
  const brandDefs = ['Northwind Goods', 'Oak & Ember', 'Lumen Labs', 'Stride Co.'];
  const brandIds: string[] = [];
  for (const name of brandDefs) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '');
    const b = await prisma.brand.upsert({ where: { slug }, update: {}, create: { name, slug, websiteUrl: 'https://example.com' } });
    brandIds.push(b.id);
  }

  // Users
  const mk = (email: string, displayName: string, role: Role, avatarUrl?: string) =>
    prisma.user.upsert({ where: { email }, update: { displayName, avatarUrl }, create: { email, displayName, role, avatarUrl, passwordHash, emailVerifiedAt: new Date() } });
  await mk('admin@reccora.test', 'Reccora Admin', Role.ADMIN);
  const shopper = await mk('shopper@reccora.test', 'Sam Shopper', Role.SHOPPER);

  // Products: upsert by slug and refresh images/links so re-seeding fixes stale data. Drop old seed products that no longer exist.
  const keep = products.map((p) => slugOf(p.title));
  await prisma.product.deleteMany({ where: { slug: { startsWith: 'seed-', notIn: keep } } });
  const byTitle: Record<string, { id: string; category: string }> = {};
  for (const p of products) {
    const slug = slugOf(p.title);
    const data = { title: p.title, description: p.description, price: p.price, merchantName: p.merchant, categoryId: cats[p.cat], brandId: brandIds[p.brand] };
    const row = await prisma.product.upsert({ where: { slug }, update: data, create: { ...data, slug } });
    await prisma.productImage.deleteMany({ where: { productId: row.id } });
    await prisma.productImage.createMany({ data: p.images.map((id, position) => ({ productId: row.id, url: photo(id, 1000, 1250), alt: p.title, position })) });
    await prisma.productLink.deleteMany({ where: { productId: row.id } });
    await prisma.productLink.create({ data: { productId: row.id, merchantName: p.merchant, url: `https://example.com/shop/${slug}`, status: 'APPROVED', isPrimary: true } });
    byTitle[p.title] = { id: row.id, category: p.cat };
  }

  // Creators, their storefronts, posts and collections (rebuilt each run for determinism)
  const creators: { id: string; handle: string; userId: string }[] = [];
  for (const c of creatorDefs) {
    const user = await mk(c.email, c.name, Role.CREATOR, photo(c.avatar, 400, 400));
    const profile = await prisma.creatorProfile.upsert({
      where: { userId: user.id },
      update: { bio: c.bio, avatarUrl: photo(c.avatar, 400, 400), coverUrl: photo(c.cover, 1600, 640), status: CreatorStatus.APPROVED },
      create: { userId: user.id, handle: c.handle, bio: c.bio, avatarUrl: photo(c.avatar, 400, 400), coverUrl: photo(c.cover, 1600, 640), status: CreatorStatus.APPROVED },
    });
    creators.push({ id: profile.id, handle: profile.handle, userId: user.id });

    await prisma.post.deleteMany({ where: { creatorId: profile.id } });
    await prisma.collection.deleteMany({ where: { creatorId: profile.id } });
    await prisma.storefrontProduct.deleteMany({ where: { creatorId: profile.id } });

    const mine = products.filter((p) => c.cats.includes(p.cat));
    for (const [i, p] of mine.entries()) {
      const pid = byTitle[p.title].id;
      await prisma.storefrontProduct.create({ data: { creatorId: profile.id, productId: pid, position: i } });
      const list = captions[p.cat];
      await prisma.post.create({
        data: {
          creatorId: profile.id,
          caption: `${list[i % list.length]}: ${p.title}. ${p.description.split('.')[0]}.`,
          mediaUrl: photo(p.images[0], 900, 1125), mediaType: 'IMAGE', status: 'PUBLISHED',
          publishedAt: new Date(Date.now() - (creators.length * 5 + i) * 3_600_000 * 3),
          products: { create: { productId: pid } },
        },
      });
    }
    for (const col of collectionDefs[c.handle] ?? []) {
      await prisma.collection.create({
        data: {
          creatorId: profile.id, title: col.title, slug: col.slug, description: col.description, coverUrl: photo(col.cover, 1400, 800),
          products: { create: col.titles.map((t, position) => ({ productId: byTitle[t].id, position })) },
        },
      });
      for (const t of col.titles) await prisma.storefrontProduct.upsert({ where: { creatorId_productId: { creatorId: profile.id, productId: byTitle[t].id } }, update: {}, create: { creatorId: profile.id, productId: byTitle[t].id } });
    }
  }

  // A little social proof so follower counts and the Saved page are not empty.
  await prisma.follow.deleteMany({ where: { followerId: shopper.id } });
  await prisma.savedProduct.deleteMany({ where: { userId: shopper.id } });
  for (const c of creators.slice(0, 2)) await prisma.follow.create({ data: { followerId: shopper.id, creatorId: c.id } });
  for (const t of ['Merino Crew Sweater', 'Studio Wireless Headphones', 'Specialty Coffee Starter Kit']) await prisma.savedProduct.create({ data: { userId: shopper.id, productId: byTitle[t].id } });
  for (const c of creators) {
    const base = creatorDefs.find((d) => d.handle === c.handle)!.followers;
    await prisma.creatorProfile.update({ where: { id: c.id }, data: { followerCount: (await prisma.follow.count({ where: { creatorId: c.id } })) + base * 1200 } });
  }
  const counts = await prisma.savedProduct.groupBy({ by: ['productId'], _count: true });
  for (const row of counts) await prisma.product.update({ where: { id: row.productId }, data: { saveCount: row._count } });

  // Default commission rule: creators receive 10% of confirmed order value.
  if ((await prisma.commissionRule.count({ where: { scope: 'DEFAULT' } })) === 0) {
    await prisma.commissionRule.create({ data: { name: 'Default creator share', scope: 'DEFAULT', rate: 0.1 } });
  }

  console.log(`Seed complete (${products.length} products, ${creators.length} creators). Logins (password "${password}"): admin@reccora.test, shopper@reccora.test, ${creatorDefs.map((c) => c.email).join(', ')}`);
}

main().finally(() => prisma.$disconnect());
