'use client';
import { FormEvent, useState } from 'react';
import { Badge, Button, Column, DataTable, Field, Input, Modal, PageHeader, Select, StatusBadge, Textarea } from '@/components/ui';
import { useList } from '@/components/use-list';
import { api, money, useApi } from '@/lib/api';

interface Link { id: string; merchantName: string; url: string; status: string; isPrimary: boolean; affiliateProvider: string | null }
interface Product {
  id: string; title: string; description: string | null; price: number; currency: string; merchantName: string; status: string; imageUrl: string | null;
  category: { id: string; name: string } | null; brand: { id: string; name: string } | null; images: { url: string }[]; links: Link[];
}
interface Category { id: string; name: string }

export default function Products() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const list = useList<Product>('/admin/products', { q: q || undefined, status: status || undefined });
  const cats = useApi<Category[]>('/admin/categories');
  const brands = useApi<{ id: string; name: string }[]>('/admin/brands/options');
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    const images = String(f.get('images') || '').split('\n').map((s) => s.trim()).filter(Boolean).map((url) => ({ url }));
    const body: Record<string, unknown> = {
      title: String(f.get('title')), description: String(f.get('description') || '') || undefined, price: Number(f.get('price')),
      currency: String(f.get('currency') || 'USD'), merchantName: String(f.get('merchantName')), status: String(f.get('status')), images,
      categoryId: String(f.get('categoryId') || '') || undefined, brandId: String(f.get('brandId') || '') || undefined,
    };
    try {
      if (editing?.id) await api(`/admin/products/${editing.id}`, { method: 'PATCH', json: body });
      else {
        const url = String(f.get('linkUrl') || '');
        if (url) body.links = [{ merchantName: String(f.get('merchantName')), url, affiliateProvider: String(f.get('provider') || '') || undefined, status: 'APPROVED', isPrimary: true }];
        await api('/admin/products', { json: body });
      }
      setEditing(null);
      await list.reload();
    } catch (err) { setError((err as Error).message); }
  }

  async function disable(p: Product) {
    if (!confirm(`Disable "${p.title}"? It will disappear from the app and its purchase links stop working.`)) return;
    await api(`/admin/products/${p.id}`, { method: 'DELETE' });
    await list.reload();
  }

  async function setLink(l: Link, status: string) {
    await api(`/admin/links/${l.id}`, { method: 'PATCH', json: { status } });
    await list.reload();
    setEditing((cur) => (cur ? { ...cur, links: cur.links?.map((x) => (x.id === l.id ? { ...x, status } : x)) } : cur));
  }

  const columns: Column<Product>[] = [
    { header: 'Product', cell: (p) => (
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {p.imageUrl ? <img src={p.imageUrl} alt="" className="h-12 w-10 rounded-lg object-cover" /> : <div className="h-12 w-10 rounded-lg bg-line" />}
        <div><div className="font-medium">{p.title}</div><div className="text-xs text-muted">{p.merchantName}{p.brand ? ` · ${p.brand.name}` : ''}</div></div>
      </div>
    ) },
    { header: 'Category', cell: (p) => p.category?.name ?? '—' },
    { header: 'Price', cell: (p) => money(p.price, p.currency), className: 'tabular-nums' },
    { header: 'Links', cell: (p) => { const ok = p.links.filter((l) => l.status === 'APPROVED').length; return <Badge tone={ok ? 'good' : 'bad'}>{ok ? `${ok} approved` : 'No approved link'}</Badge>; } },
    { header: 'Status', cell: (p) => <StatusBadge status={p.status} /> },
    { header: '', cell: (p) => <div className="flex gap-2"><Button variant="secondary" onClick={() => setEditing(p)}>Edit</Button>{p.status !== 'DISABLED' && <Button variant="ghost" onClick={() => disable(p)}>Disable</Button>}</div> },
  ];

  return (
    <>
      <PageHeader title="Products" subtitle="Manage the catalogue and merchant links" action={<Button onClick={() => setEditing({})}>Add product</Button>} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Search products" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"><option value="">All statuses</option><option>ACTIVE</option><option>DRAFT</option><option>DISABLED</option></Select>
      </div>
      <DataTable columns={columns} data={list.data} loading={list.loading} error={list.error} onRetry={list.reload} onPage={list.setPage} empty="No products yet. Add your first product." />

      {editing && (
        <Modal title={editing.id ? 'Edit product' : 'Add product'} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="space-y-4">
            <Field label="Title"><Input name="title" required minLength={2} defaultValue={editing.title} /></Field>
            <Field label="Description"><Textarea name="description" rows={3} defaultValue={editing.description ?? ''} /></Field>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2"><Field label="Price"><Input name="price" type="number" step="0.01" min="0" required defaultValue={editing.price} /></Field></div>
              <Field label="Currency"><Input name="currency" maxLength={3} defaultValue={editing.currency ?? 'USD'} /></Field>
            </div>
            <Field label="Merchant name"><Input name="merchantName" required defaultValue={editing.merchantName} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category"><Select name="categoryId" defaultValue={editing.category?.id ?? ''} className="w-full"><option value="">None</option>{cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
              <Field label="Brand"><Select name="brandId" defaultValue={editing.brand?.id ?? ''} className="w-full"><option value="">None</option>{brands.data?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>
            </div>
            <Field label="Image URLs" hint="One per line. The first is the cover image."><Textarea name="images" rows={3} defaultValue={editing.images?.map((i) => i.url).join('\n')} /></Field>
            <Field label="Status"><Select name="status" defaultValue={editing.status ?? 'ACTIVE'} className="w-full"><option>ACTIVE</option><option>DRAFT</option><option>DISABLED</option></Select></Field>

            {!editing.id ? (
              <fieldset className="space-y-3 rounded-xl border border-line p-3">
                <legend className="px-1 text-sm font-medium">Purchase link</legend>
                <Field label="Merchant / affiliate URL" hint="Shoppers are redirected here through Reccora click tracking."><Input name="linkUrl" type="url" placeholder="https://" /></Field>
                <Field label="Affiliate provider" hint="Leave empty if the link is not tied to a configured network."><Input name="provider" /></Field>
              </fieldset>
            ) : (
              <fieldset className="space-y-2 rounded-xl border border-line p-3">
                <legend className="px-1 text-sm font-medium">Purchase links</legend>
                {editing.links?.length === 0 && <p className="text-sm text-muted">No links. Add one with the API (POST /admin/products/:id/links).</p>}
                {editing.links?.map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate" title={l.url}>{l.merchantName}: {l.url}</span>
                    <Select value={l.status} onChange={(e) => setLink(l, e.target.value)} aria-label="Link status"><option>PENDING</option><option>APPROVED</option><option>DISABLED</option></Select>
                  </div>
                ))}
              </fieldset>
            )}
            {error && <p role="alert" className="text-sm text-bad">{error}</p>}
            <Button type="submit" className="w-full">Save product</Button>
          </form>
        </Modal>
      )}
    </>
  );
}
