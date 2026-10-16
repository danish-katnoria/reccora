'use client';
import { FormEvent, useState } from 'react';
import { Button, Card, Column, DataTable, Field, Input, PageHeader, Select, StatusBadge, Tabs, Textarea } from '@/components/ui';
import { useList } from '@/components/use-list';
import { api, dateTime, money } from '@/lib/api';

interface Click { id: string; attributionRef: string; source: string | null; createdAt: string; product: { title: string }; creator: { handle: string } | null }
interface Conversion { id: string; provider: string; externalId: string; status: string; orderAmount: string; currency: string; occurredAt: string; attributionRef: string | null; creator: { handle: string } | null; commission: { id: string; status: string } | null }

export default function Tracking() {
  const [tab, setTab] = useState<'clicks' | 'conversions' | 'import'>('clicks');
  return (
    <>
      <PageHeader title="Affiliate tracking" subtitle="Clicks are recorded by Reccora. Conversions come only from verified provider callbacks or imports." />
      <Tabs tabs={[{ id: 'clicks', label: 'Clicks' }, { id: 'conversions', label: 'Conversions' }, { id: 'import', label: 'Import' }]} value={tab} onChange={setTab} />
      {tab === 'clicks' && <Clicks />}
      {tab === 'conversions' && <Conversions />}
      {tab === 'import' && <Import />}
    </>
  );
}

function Clicks() {
  const list = useList<Click>('/admin/clicks');
  const columns: Column<Click>[] = [
    { header: 'Time', cell: (c) => dateTime(c.createdAt) },
    { header: 'Product', cell: (c) => c.product.title },
    { header: 'Creator', cell: (c) => (c.creator ? `@${c.creator.handle}` : '—') },
    { header: 'Source', cell: (c) => c.source ?? '—' },
    { header: 'Attribution ref', cell: (c) => <code className="text-xs">{c.attributionRef}</code> },
  ];
  return <DataTable columns={columns} data={list.data} loading={list.loading} error={list.error} onRetry={list.reload} onPage={list.setPage} empty="No clicks recorded yet." />;
}

function Conversions() {
  const [status, setStatus] = useState('');
  const list = useList<Conversion>('/admin/conversions', { status: status || undefined });
  const columns: Column<Conversion>[] = [
    { header: 'Occurred', cell: (c) => dateTime(c.occurredAt) },
    { header: 'Provider', cell: (c) => <div><div>{c.provider}</div><div className="font-mono text-xs text-muted">{c.externalId}</div></div> },
    { header: 'Creator', cell: (c) => (c.creator ? `@${c.creator.handle}` : <span className="text-muted">unattributed</span>) },
    { header: 'Order', cell: (c) => money(c.orderAmount, c.currency), className: 'tabular-nums' },
    { header: 'Status', cell: (c) => <StatusBadge status={c.status} /> },
    { header: 'Commission', cell: (c) => (c.commission ? <StatusBadge status={c.commission.status} /> : '—') },
  ];
  return (
    <>
      <div className="mb-4"><Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter conversions"><option value="">All statuses</option><option>PENDING</option><option>CONFIRMED</option><option>REVERSED</option><option>REJECTED</option></Select></div>
      <DataTable columns={columns} data={list.data} loading={list.loading} error={list.error} onRetry={list.reload} onPage={list.setPage} empty="No conversions recorded. Conversion tracking is pending affiliate-network integration." />
    </>
  );
}

function Import() {
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const example = JSON.stringify([{ externalId: 'ORDER-123', attributionRef: 'rc_…', status: 'CONFIRMED', orderAmount: 49.99, currency: 'USD', occurredAt: new Date().toISOString() }], null, 2);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResult(null); setError(null);
    const f = new FormData(e.currentTarget);
    try {
      const conversions = JSON.parse(String(f.get('json')));
      const res = await api<{ processed: number }>('/admin/conversions/import', { json: { provider: String(f.get('provider')), conversions } });
      setResult(`Processed ${res.processed} conversion(s).`);
    } catch (err) { setError(err instanceof SyntaxError ? 'Invalid JSON' : (err as Error).message); }
  }

  return (
    <Card title="Import verified conversions">
      <p className="mb-4 text-sm text-muted">Use this only with evidence from your affiliate network report (e.g. a downloaded CSV converted to JSON). Imports are idempotent per provider + external ID. Do not enter estimated or unverified sales.</p>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Provider name"><Input name="provider" required placeholder="e.g. awin-report" /></Field>
        <Field label="Conversions (JSON array)"><Textarea name="json" rows={10} required defaultValue={example} className="font-mono text-xs" /></Field>
        {error && <p role="alert" className="text-sm text-bad">{error}</p>}
        {result && <p role="status" className="text-sm text-good">{result}</p>}
        <Button type="submit">Import</Button>
      </form>
    </Card>
  );
}
