'use client';
import { useState } from 'react';
import { Button, Column, DataTable, Input, PageHeader, Select, StatusBadge } from '@/components/ui';
import { useList } from '@/components/use-list';
import { api, dateTime } from '@/lib/api';

interface Creator { id: string; handle: string; status: string; followerCount: number; createdAt: string; user: { email: string; displayName: string }; _count: { posts: number } }

export default function Creators() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const list = useList<Creator>('/admin/creators', { q: q || undefined, status: status || undefined });

  async function setCreatorStatus(c: Creator, next: 'APPROVED' | 'SUSPENDED') {
    if (next === 'SUSPENDED' && !confirm(`Suspend @${c.handle}? Their profile and content will be hidden.`)) return;
    setBusy(c.id);
    try { await api(`/admin/creators/${c.id}/status`, { method: 'PATCH', json: { status: next } }); await list.reload(); }
    catch (e) { alert((e as Error).message); }
    finally { setBusy(null); }
  }

  const columns: Column<Creator>[] = [
    { header: 'Creator', cell: (c) => <div><div className="font-medium">@{c.handle}</div><div className="text-xs text-muted">{c.user.displayName} · {c.user.email}</div></div> },
    { header: 'Status', cell: (c) => <StatusBadge status={c.status} /> },
    { header: 'Followers', cell: (c) => c.followerCount.toLocaleString(), className: 'tabular-nums' },
    { header: 'Posts', cell: (c) => c._count.posts, className: 'tabular-nums' },
    { header: 'Joined', cell: (c) => dateTime(c.createdAt) },
    { header: 'Actions', cell: (c) => (
      <div className="flex gap-2">
        {c.status !== 'APPROVED' && <Button disabled={busy === c.id} onClick={() => setCreatorStatus(c, 'APPROVED')}>Approve</Button>}
        {c.status !== 'SUSPENDED' && <Button variant="secondary" disabled={busy === c.id} onClick={() => setCreatorStatus(c, 'SUSPENDED')}>Suspend</Button>}
      </div>
    ) },
  ];

  return (
    <>
      <PageHeader title="Creators" subtitle="Approve or suspend creator accounts" />
      <div className="mb-4 flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Search handle, name or email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search creators" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option><option>PENDING</option><option>APPROVED</option><option>SUSPENDED</option>
        </Select>
      </div>
      <DataTable columns={columns} data={list.data} loading={list.loading} error={list.error} onRetry={list.reload} onPage={list.setPage} empty="No creators match." />
    </>
  );
}
