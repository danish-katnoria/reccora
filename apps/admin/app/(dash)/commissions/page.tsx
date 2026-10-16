'use client';
import { FormEvent, useState } from 'react';
import { Button, Card, Column, DataTable, ErrorState, Field, Input, Modal, PageHeader, Select, StatusBadge, Tabs } from '@/components/ui';
import { useList } from '@/components/use-list';
import { api, dateTime, money, useApi } from '@/lib/api';

interface Commission { id: string; amount: string; currency: string; rate: string; status: string; createdAt: string; creatorId: string; creator: { handle: string }; conversion: { provider: string; externalId: string; orderAmount: string; status: string } }
interface Payout { id: string; amount: string; currency: string; status: string; reference: string | null; note: string | null; createdAt: string; creator: { handle: string }; _count: { commissions: number } }
interface Rule { id: string; name: string; scope: string; rate: string; isActive: boolean }

export default function Commissions() {
  const [tab, setTab] = useState<'commissions' | 'payouts' | 'rules'>('commissions');
  return (
    <>
      <PageHeader title="Commissions & payouts" subtitle="Commissions exist only for confirmed conversions. Payouts are records for review; Reccora does not move money." />
      <Tabs tabs={[{ id: 'commissions', label: 'Commissions' }, { id: 'payouts', label: 'Payouts' }, { id: 'rules', label: 'Rules' }]} value={tab} onChange={setTab} />
      {tab === 'commissions' && <Commissions_ />}
      {tab === 'payouts' && <Payouts />}
      {tab === 'rules' && <Rules />}
    </>
  );
}

function Commissions_() {
  const [status, setStatus] = useState('PENDING');
  const list = useList<Commission>('/admin/commissions', { status: status || undefined });
  const [payoutFor, setPayoutFor] = useState<Commission | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(c: Commission, action: 'approve' | 'void') {
    if (action === 'void' && !confirm('Void this commission?')) return;
    try { await api(`/admin/commissions/${c.id}/${action}`, { method: 'POST', json: {} }); await list.reload(); }
    catch (e) { alert((e as Error).message); }
  }

  async function createPayout(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    try {
      await api('/admin/payouts', { json: { creatorId: payoutFor!.creatorId, currency: payoutFor!.currency, note: String(f.get('note') || '') || undefined } });
      setPayoutFor(null);
      await list.reload();
    } catch (err) { setError((err as Error).message); }
  }

  const columns: Column<Commission>[] = [
    { header: 'Created', cell: (c) => dateTime(c.createdAt) },
    { header: 'Creator', cell: (c) => `@${c.creator.handle}` },
    { header: 'Conversion', cell: (c) => <div><div className="font-mono text-xs">{c.conversion.provider}:{c.conversion.externalId}</div><div className="text-xs text-muted">Order {money(c.conversion.orderAmount, c.currency)} · {c.conversion.status}</div></div> },
    { header: 'Rate', cell: (c) => `${(Number(c.rate) * 100).toFixed(2)}%`, className: 'tabular-nums' },
    { header: 'Commission', cell: (c) => <b>{money(c.amount, c.currency)}</b>, className: 'tabular-nums' },
    { header: 'Status', cell: (c) => <StatusBadge status={c.status} /> },
    { header: 'Actions', cell: (c) => (
      <div className="flex flex-wrap gap-2">
        {c.status === 'PENDING' && <Button onClick={() => act(c, 'approve')}>Approve</Button>}
        {c.status === 'APPROVED' && <Button variant="secondary" onClick={() => setPayoutFor(c)}>Create payout</Button>}
        {!['PAID', 'VOID'].includes(c.status) && <Button variant="ghost" onClick={() => act(c, 'void')}>Void</Button>}
      </div>
    ) },
  ];

  return (
    <>
      <div className="mb-4"><Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter commissions"><option value="">All</option><option>PENDING</option><option>APPROVED</option><option>PAYABLE</option><option>PAID</option><option>VOID</option></Select></div>
      <DataTable columns={columns} data={list.data} loading={list.loading} error={list.error} onRetry={list.reload} onPage={list.setPage} empty="No commissions. They appear only after a confirmed, attributed conversion." />
      {payoutFor && (
        <Modal title={`Create payout for @${payoutFor.creator.handle}`} onClose={() => setPayoutFor(null)}>
          <form onSubmit={createPayout} className="space-y-4">
            <p className="text-sm text-muted">This bundles all of this creator’s APPROVED {payoutFor.currency} commissions into a draft payout record. No money is transferred.</p>
            <Field label="Note"><Input name="note" maxLength={500} /></Field>
            {error && <p role="alert" className="text-sm text-bad">{error}</p>}
            <Button type="submit" className="w-full">Create draft payout</Button>
          </form>
        </Modal>
      )}
    </>
  );
}

function Payouts() {
  const list = useList<Payout>('/admin/payouts');
  const [paying, setPaying] = useState<Payout | null>(null);

  async function markPaid(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try { await api(`/admin/payouts/${paying!.id}/mark-paid`, { json: { reference: String(f.get('reference')) } }); setPaying(null); await list.reload(); }
    catch (err) { alert((err as Error).message); }
  }
  async function cancel(p: Payout) {
    if (!confirm('Cancel this payout? Its commissions return to APPROVED.')) return;
    await api(`/admin/payouts/${p.id}/cancel`, { json: {} });
    await list.reload();
  }

  const columns: Column<Payout>[] = [
    { header: 'Created', cell: (p) => dateTime(p.createdAt) },
    { header: 'Creator', cell: (p) => `@${p.creator.handle}` },
    { header: 'Amount', cell: (p) => <b>{money(p.amount, p.currency)}</b>, className: 'tabular-nums' },
    { header: 'Commissions', cell: (p) => p._count.commissions },
    { header: 'Status', cell: (p) => <StatusBadge status={p.status} /> },
    { header: 'Reference', cell: (p) => p.reference ?? '—' },
    { header: '', cell: (p) => ['DRAFT', 'APPROVED'].includes(p.status) && <div className="flex gap-2"><Button onClick={() => setPaying(p)}>Record as paid</Button><Button variant="ghost" onClick={() => cancel(p)}>Cancel</Button></div> },
  ];
  return (
    <>
      <DataTable columns={columns} data={list.data} loading={list.loading} error={list.error} onRetry={list.reload} onPage={list.setPage} empty="No payout records." />
      {paying && (
        <Modal title="Record payout as paid" onClose={() => setPaying(null)}>
          <form onSubmit={markPaid} className="space-y-4">
            <p className="text-sm text-muted">Confirm you have already paid {money(paying.amount, paying.currency)} to @{paying.creator.handle} outside Reccora. Enter the transfer reference.</p>
            <Field label="Payment reference"><Input name="reference" required minLength={2} /></Field>
            <Button type="submit" className="w-full">Confirm recorded</Button>
          </form>
        </Modal>
      )}
    </>
  );
}

function Rules() {
  const { data, error, reload } = useApi<Rule[]>('/admin/commission-rules');
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const f = new FormData(e.currentTarget);
    try {
      await api('/admin/commission-rules', { json: { name: String(f.get('name')), scope: 'DEFAULT', rate: Number(f.get('rate')) / 100 } });
      setAdding(false);
      await reload();
    } catch (err) { setFormError((err as Error).message); }
  }
  async function toggle(r: Rule) { await api(`/admin/commission-rules/${r.id}`, { method: 'PATCH', json: { isActive: !r.isActive } }); await reload(); }

  if (error) return <ErrorState error={error} onRetry={reload} />;
  return (
    <Card title="Commission rules" action={<Button onClick={() => setAdding(true)}>Add default rule</Button>}>
      <p className="mb-4 text-sm text-muted">Creator commission = order amount × rate. The most specific active rule wins: creator &gt; brand &gt; category &gt; default. Category, brand and creator rules can be created through the API.</p>
      {data?.length === 0 && <p className="py-6 text-center text-sm text-muted">No rules configured. Confirmed conversions will not generate commissions until a rule exists.</p>}
      <ul className="divide-y divide-line">
        {data?.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 py-3 text-sm">
            <div><span className="font-medium">{r.name}</span> <span className="text-muted">· {r.scope}</span></div>
            <div className="flex items-center gap-3"><b className="tabular-nums">{(Number(r.rate) * 100).toFixed(2)}%</b><StatusBadge status={r.isActive ? 'ACTIVE' : 'DISABLED'} /><Button variant="secondary" onClick={() => toggle(r)}>{r.isActive ? 'Disable' : 'Enable'}</Button></div>
          </li>
        ))}
      </ul>
      {adding && (
        <Modal title="Add default rule" onClose={() => setAdding(false)}>
          <form onSubmit={create} className="space-y-4">
            <Field label="Name"><Input name="name" required minLength={2} defaultValue="Default creator share" /></Field>
            <Field label="Creator share of order amount (%)"><Input name="rate" type="number" step="0.01" min="0" max="100" required /></Field>
            {formError && <p role="alert" className="text-sm text-bad">{formError}</p>}
            <Button type="submit" className="w-full">Save rule</Button>
          </form>
        </Modal>
      )}
    </Card>
  );
}
