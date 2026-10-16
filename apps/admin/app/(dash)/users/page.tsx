'use client';
import { useState } from 'react';
import { Button, Column, DataTable, Input, PageHeader, Select, StatusBadge } from '@/components/ui';
import { useList } from '@/components/use-list';
import { api, dateTime } from '@/lib/api';

interface User { id: string; email: string; displayName: string; role: string; status: string; createdAt: string }

export default function Users() {
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const list = useList<User>('/admin/users', { q: q || undefined, role: role || undefined, status: status || undefined });

  async function toggle(u: User) {
    const next = u.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    if (next === 'SUSPENDED' && !confirm(`Suspend ${u.email}? They will be signed out.`)) return;
    try { await api(`/admin/users/${u.id}/status`, { method: 'PATCH', json: { status: next } }); await list.reload(); }
    catch (e) { alert((e as Error).message); }
  }

  const columns: Column<User>[] = [
    { header: 'User', cell: (u) => <div><div className="font-medium">{u.displayName}</div><div className="text-xs text-muted">{u.email}</div></div> },
    { header: 'Role', cell: (u) => u.role },
    { header: 'Status', cell: (u) => <StatusBadge status={u.status} /> },
    { header: 'Joined', cell: (u) => dateTime(u.createdAt) },
    { header: '', cell: (u) => u.status !== 'DELETED' && u.role !== 'ADMIN' ? <Button variant="secondary" onClick={() => toggle(u)}>{u.status === 'SUSPENDED' ? 'Reinstate' : 'Suspend'}</Button> : null },
  ];

  return (
    <>
      <PageHeader title="Users" subtitle="All registered accounts" />
      <div className="mb-4 flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search users" />
        <Select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Filter by role"><option value="">All roles</option><option>SHOPPER</option><option>CREATOR</option><option>ADMIN</option></Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"><option value="">All statuses</option><option>ACTIVE</option><option>SUSPENDED</option><option>DELETED</option></Select>
      </div>
      <DataTable columns={columns} data={list.data} loading={list.loading} error={list.error} onRetry={list.reload} onPage={list.setPage} />
    </>
  );
}
