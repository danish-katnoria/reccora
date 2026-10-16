import type { Metadata } from 'next';
import { sget } from '@/lib/server-api';
import type { FeedPost } from '@/lib/types';
import { PostView } from './post-view';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const p = await sget<FeedPost>(`/posts/${id}`, { revalidate: false });
    return { title: `${p.creator.displayName}: ${p.caption.slice(0, 60)}`, description: p.caption.slice(0, 160), openGraph: { images: [p.thumbnailUrl ?? p.mediaUrl] } };
  } catch { return { title: 'Recommendation' }; }
}

export default async function PostPage({ params }: Props) {
  const { id } = await params;
  const post = await sget<FeedPost>(`/posts/${id}`, { revalidate: false });
  return <PostView post={post} />;
}
