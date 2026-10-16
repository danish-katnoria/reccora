'use client';
import { useState } from 'react';
import { Button, Column, DataTable, PageHeader, Select, StatusBadge, Tabs } from '@/components/ui';
import { useList } from '@/components/use-list';
import { api, dateTime } from '@/lib/api';

interface Report { id: string; targetType: string; targetId: string; reason: string; details: string | null; status: string; createdAt: string; reporter: { email: string } }
interface Post { id: string; caption: string; status: string; mediaUrl: string; mediaType: string; createdAt: string; creator: { handle: string }; _count: { products: number } }

export default function Moderation() {
  const [tab, setTab] = useState<'reports' | 'posts'>('reports');
  return (
    <>
      <PageHeader title="Moderation" subtitle="Review reported content and manage posts" />
      <Tabs tabs={[{ id: 'reports', label: 'Reports' }, { id: 'posts', label: 'Posts' }]} value={tab} onChange={setTab} />
      {tab === 'reports' ? <Reports /> : <Posts />}
    </>
  );
}

function Reports() {
  const [status, setStatus] = useState('OPEN');
  const list = useList<Report>('/admin/reports', { status: status || undefined });

  async function resolve(r: Report, next: 'RESOLVED' | 'DISMISSED', removeContent = false) {
    if (removeContent && !confirm('Remove the reported content?')) return;
    await api(`/admin/reports/${r.id}`, { method: 'PATCH', json: { status: next, removeContent } });
    await list.reload();
  }

  const columns: Column<Report>[] = [
    { header: 'Target', cell: (r) => <div><div className="font-medium">{r.targetType}</div><div className="font-mono text-xs text-muted">{r.targetId.slice(0, 8)}</div></div> },
    { header: 'Reason', cell: (r) => <div><div>{r.reason}</div>{r.details && <div className="text-xs text-muted">{r.details}</div>}</div> },
    { header: 'Reporter', cell: (r) => r.reporter.email },
    { header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
    { header: 'Filed', cell: (r) => dateTime(r.createdAt) },
    { header: 'Actions', cell: (r) => ['OPEN', 'REVIEWING'].includes(r.status) && (
      <div className="flex flex-wrap gap-2">
        <Button variant="danger" onClick={() => resolve(r, 'RESOLVED', true)}>Remove content</Button>
        <Button variant="secondary" onClick={() => resolve(r, 'RESOLVED')}>Resolve</Button>
        <Button variant="ghost" onClick={() => resolve(r, 'DISMISSED')}>Dismiss</Button>
      </div>
    ) },
  ];
  return (
    <>
      <div className="mb-4"><Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter reports"><option value="">All</option><option>OPEN</option><option>REVIEWING</option><option>RESOLVED</option><option>DISMISSED</option></Select></div>
      <DataTable columns={columns} data={list.data} loading={list.loading} error={list.error} onRetry={list.reload} onPage={list.setPage} empty="No reports to review." />
    </>
  );
}

function Posts() {
  const [status, setStatus] = useState('');
  const list = useList<Post>('/admin/posts', { status: status || undefined });

  async function setPostStatus(p: Post, next: string) {
    if (next === 'REMOVED' && !confirm('Remove this post? The creator will be notified.')) return;
    await api(`/admin/posts/${p.id}/status`, { method: 'PATCH', json: { status: next } });
    await list.reload();
  }

  const columns: Column<Post>[] = [
    { header: 'Post', cell: (p) => (
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {p.mediaType === 'IMAGE' ? <img src={p.mediaUrl} alt="" className="h-12 w-10 rounded-lg object-cover" /> : <div className="grid h-12 w-10 place-items-center rounded-lg bg-line text-xs">Video</div>}
        <div className="max-w-xs"><div className="line-clamp-2">{p.caption}</div><div className="text-xs text-muted">@{p.creator.handle} · {p._count.products} product(s)</div></div>
      </div>
    ) },
    { header: 'Status', cell: (p) => <StatusBadge status={p.status} /> },
    { header: 'Created', cell: (p) => dateTime(p.createdAt) },
    { header: '', cell: (p) => p.status === 'REMOVED'
      ? <Button variant="secondary" onClick={() => setPostStatus(p, 'PUBLISHED')}>Restore</Button>
      : <Button variant="danger" onClick={() => setPostStatus(p, 'REMOVED')}>Remove</Button> },
  ];
  return (
    <>
      <div className="mb-4"><Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter posts"><option value="">All posts</option><option>PUBLISHED</option><option>DRAFT</option><option>REMOVED</option></Select></div>
      <DataTable columns={columns} data={list.data} loading={list.loading} error={list.error} onRetry={list.reload} onPage={list.setPage} />
    </>
  );
}
