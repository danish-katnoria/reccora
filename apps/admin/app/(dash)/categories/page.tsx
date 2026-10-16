'use client';
import { FormEvent, useState } from 'react';
import { Button, Card, Field, Input, Modal, PageHeader, Select, StatusBadge, ErrorState } from '@/components/ui';
import { api, useApi } from '@/lib/api';

interface Category { id: string; name: string; slug: string; parentId: string | null; sortOrder: number; isActive: boolean }

export default function Categories() {
  const { data, error, loading, reload } = useApi<Category[]>('/admin/categories');
  const [editing, setEditing] = useState<Partial<Category> | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const f = new FormData(e.currentTarget);
    const parentId = String(f.get('parentId') || '');
    const body = { name: String(f.get('name')), sortOrder: Number(f.get('sortOrder') || 0), ...(parentId ? { parentId } : {}) };
    try {
      if (editing?.id) await api(`/admin/categories/${editing.id}`, { method: 'PATCH', json: body });
      else await api('/admin/categories', { json: body });
      setEditing(null);
      await reload();
    } catch (err) { setFormError((err as Error).message); }
  }

  async function remove(c: Category) {
    if (!confirm(`Remove "${c.name}"? Categories in use are deactivated instead.`)) return;
    try { await api(`/admin/categories/${c.id}`, { method: 'DELETE' }); await reload(); } catch (e) { alert((e as Error).message); }
  }

  if (error) return <ErrorState error={error} onRetry={reload} />;
  const roots = (data ?? []).filter((c) => !c.parentId);

  return (
    <>
      <PageHeader title="Categories" subtitle="Organise the product catalogue" action={<Button onClick={() => setEditing({})}>Add category</Button>} />
      <Card>
        {loading && <div className="h-24 animate-pulse rounded bg-line" />}
        {data && data.length === 0 && <p className="py-8 text-center text-sm text-muted">No categories yet.</p>}
        <ul className="divide-y divide-line">
          {roots.map((r) => (
            <li key={r.id} className="py-3">
              <Row c={r} onEdit={setEditing} onRemove={remove} />
              <ul className="ml-6 mt-2 space-y-2">{(data ?? []).filter((c) => c.parentId === r.id).map((c) => <li key={c.id}><Row c={c} onEdit={setEditing} onRemove={remove} /></li>)}</ul>
            </li>
          ))}
        </ul>
      </Card>
      {editing && (
        <Modal title={editing.id ? 'Edit category' : 'Add category'} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="space-y-4">
            <Field label="Name"><Input name="name" required minLength={2} defaultValue={editing.name} /></Field>
            <Field label="Parent category">
              <Select name="parentId" defaultValue={editing.parentId ?? ''} className="w-full">
                <option value="">None (top level)</option>
                {roots.filter((r) => r.id !== editing.id).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </Select>
            </Field>
            <Field label="Sort order"><Input name="sortOrder" type="number" defaultValue={editing.sortOrder ?? 0} /></Field>
            {formError && <p role="alert" className="text-sm text-bad">{formError}</p>}
            <Button type="submit" className="w-full">Save</Button>
          </form>
        </Modal>
      )}
    </>
  );
}

function Row({ c, onEdit, onRemove }: { c: Category; onEdit: (c: Category) => void; onRemove: (c: Category) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2"><span className="font-medium">{c.name}</span><span className="text-xs text-muted">/{c.slug}</span>{!c.isActive && <StatusBadge status="DISABLED" />}</div>
      <div className="flex gap-2"><Button variant="secondary" onClick={() => onEdit(c)}>Edit</Button><Button variant="ghost" onClick={() => onRemove(c)}>Remove</Button></div>
    </div>
  );
}
