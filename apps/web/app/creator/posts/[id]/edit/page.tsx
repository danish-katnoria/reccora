'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ErrorState, Skeleton } from '@/components/states';
import { api, errorMessage } from '@/lib/client-api';
import type { FeedPost } from '@/lib/types';
import { Composer } from '../../../composer';

export default function EditPostPage() {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<FeedPost | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { api<FeedPost>(`/posts/mine/${id}`).then(setPost).catch((e) => setError(errorMessage(e))); }, [id]);
  if (error) return <div className="mx-auto max-w-3xl px-4 py-16"><ErrorState message={error} /></div>;
  if (!post) return <div className="mx-auto max-w-5xl px-4 py-12"><Skeleton className="h-[480px]" /></div>;
  return <Composer existing={post} />;
}
