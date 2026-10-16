'use client';
import { FormEvent, useState } from 'react';
import { Button, Column, DataTable, Field, Input, Modal, PageHeader, StatusBadge } from '@/components/ui';
import { useList } from '@/components/use-list';
import { api } from '@/lib/api';

interface Brand { id: string; name: string; slug: string; websiteUrl: string | null; isActive: boolean }

export default function Brands() {
  const list = useList<Brand>('/admin/brands');
  const [editing, setEditing] = useState<Partial<Brand> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    const body = { name: String(f.get('name')), websiteUrl: String(f.get('websiteUrl') || '') || undefined };
    try {
      if (editing?.id) await api(`/admin/brands/${editing.id}`, { method: 'PATCH', json: body });
      else await api('/admin/brands', { json: body });
      setEditing(null);
      await list.reload();
    } catch (err) { setError((err as Error).message); }
  }

  async function toggle(b: Brand) {
    await api(`/admin/brands/${b.id}`, { method: 'PATCH', json: { isActive: !b.isActive } });
    await list.reload();
  }

  const columns: Column<Brand>[] = [
    { header: 'Brand', cell: (b) => <span className="font-medium">{b.name}</span> },
    { header: 'Website', cell: (b) => b.websiteUrl ?? '—' },
    { header: 'Status', cell: (b) => <StatusBadge status={b.isActive ? 'ACTIVE' : 'DISABLED'} /> },
    { header: '', cell: (b) => <div className="flex gap-2"><Button variant="secondary" onClick={() => setEditing(b)}>Edit</Button><Button variant="ghost" onClick={() => toggle(b)}>{b.isActive ? 'Disable' : 'Enable'}</Button></div> },
  ];

  return (
    <>
      <PageHeader title="Brands" subtitle="Onboard brands manually" action={<Button onClick={() => setEditing({})}>Add brand</Button>} />
      <DataTable columns={columns} data={list.data} loading={list.loading} error={list.error} onRetry={list.reload} onPage={list.setPage} empty="No brands yet." />
      {editing && (
        <Modal title={editing.id ? 'Edit brand' : 'Add brand'} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="space-y-4">
            <Field label="Name"><Input name="name" required defaultValue={editing.name} minLength={2} /></Field>
            <Field label="Website"><Input name="websiteUrl" type="url" defaultValue={editing.websiteUrl ?? ''} placeholder="https://" /></Field>
            {error && <p role="alert" className="text-sm text-bad">{error}</p>}
            <Button type="submit" className="w-full">Save</Button>
          </form>
        </Modal>
      )}
    </>
  );
}
