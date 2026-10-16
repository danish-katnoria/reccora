import { Suspense } from 'react';
import { ExploreClient } from './explore-client';
import { sgetSafe } from '@/lib/server-api';
import type { Category } from '@/lib/types';

export const metadata = { title: 'Explore' };
export const dynamic = 'force-dynamic';

export default async function ExplorePage() {
  const categories = await sgetSafe<Category[]>('/categories', []);
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-12 sm:px-6"><div className="skeleton h-12 w-full rounded-full" /></div>}>
      <ExploreClient categories={categories} />
    </Suspense>
  );
}
