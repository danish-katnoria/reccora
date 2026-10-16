import type { Metadata } from 'next';
import { StorefrontView } from './storefront-view';
import { sget } from '@/lib/server-api';
import type { CreatorSummary, Storefront } from '@/lib/types';

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  try {
    // Metadata uses the cached read; the page itself fetches uncached so each real view counts as a storefront visit.
    const c = await sget<CreatorSummary>(`/creators/${handle}`, { revalidate: 60 });
    return { title: `${c.displayName} (@${c.handle})`, description: c.bio ?? `Shop ${c.displayName}'s recommendations on Reccora`, openGraph: { title: `${c.displayName} on Reccora`, images: c.avatarUrl ? [c.avatarUrl] : undefined, type: 'profile' } };
  } catch { return { title: 'Creator' }; }
}

export default async function StorefrontPage({ params }: Props) {
  const { handle } = await params;
  const data = await sget<Storefront>(`/creators/${handle}/storefront`, { revalidate: false });
  return <StorefrontView data={data} />;
}
