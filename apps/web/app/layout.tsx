import type { Metadata, Viewport } from 'next';
import { Footer } from '@/components/footer';
import { Header } from '@/components/header';
import { Providers } from '@/components/providers';
import './globals.css';

const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3002';

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: 'Reccora — Discover what creators love', template: '%s · Reccora' },
  description: 'Shop the products your favourite creators actually recommend. Browse storefronts, save favourites and buy from the merchant.',
  openGraph: { siteName: 'Reccora', type: 'website' },
};
export const viewport: Viewport = { themeColor: '#faf8f5' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Providers>
          <Header />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
