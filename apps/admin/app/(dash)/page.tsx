'use client';
import { Card, ErrorState, PageHeader, StatCard } from '@/components/ui';
import { money, useApi } from '@/lib/api';

interface Overview {
  totals: Record<string, number>;
  last30Days: { productClicks: number; storefrontVisits: number };
  clicksByDay: { day: string; clicks: number }[];
  conversions: { status: string; count: number }[];
  commissions: { status: string; count: number; amount: number }[];
}

const LABELS: Record<string, string> = {
  users: 'Active users', creators: 'Approved creators', pendingCreators: 'Creators awaiting approval', products: 'Active products',
  brands: 'Brands', publishedPosts: 'Published posts', openReports: 'Open reports',
};

export default function Overview() {
  const { data, error, loading, reload } = useApi<Overview>('/admin/overview');
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (loading || !data) return <div className="h-40 animate-pulse rounded-2xl bg-line" aria-busy="true" />;

  const max = Math.max(1, ...data.clicksByDay.map((d) => d.clicks));
  const hasConversions = data.conversions.length > 0;

  return (
    <>
      <PageHeader title="Overview" subtitle="Platform activity across Reccora" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Object.entries(data.totals).map(([k, v]) => <StatCard key={k} label={LABELS[k] ?? k} value={v.toLocaleString()} />)}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card title="Outbound clicks, last 30 days" className="lg:col-span-2">
          <div className="mb-3 flex gap-6 text-sm">
            <div><span className="text-muted">Clicks </span><b className="tabular-nums">{data.last30Days.productClicks.toLocaleString()}</b></div>
            <div><span className="text-muted">Storefront visits </span><b className="tabular-nums">{data.last30Days.storefrontVisits.toLocaleString()}</b></div>
          </div>
          {data.clicksByDay.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">No clicks recorded yet.</p>
          ) : (
            <div className="flex h-40 items-end gap-1" role="img" aria-label="Clicks per day">
              {data.clicksByDay.map((d) => (
                <div key={String(d.day)} title={`${new Date(d.day).toLocaleDateString()}: ${d.clicks}`} className="flex-1 rounded-t bg-accent/80" style={{ height: `${Math.max(4, (d.clicks / max) * 100)}%` }} />
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-muted">Clicks are not sales. Sales only appear below once an affiliate integration confirms them.</p>
        </Card>

        <Card title="Affiliate conversions">
          {hasConversions ? (
            <ul className="space-y-2 text-sm">{data.conversions.map((c) => <li key={c.status} className="flex justify-between"><span>{c.status}</span><b className="tabular-nums">{c.count}</b></li>)}</ul>
          ) : (
            <p className="text-sm text-muted">No conversions recorded. Conversion tracking is pending affiliate-network integration.</p>
          )}
          <h3 className="mb-2 mt-5 text-sm font-semibold">Commissions</h3>
          {data.commissions.length === 0 ? <p className="text-sm text-muted">None yet.</p> : (
            <ul className="space-y-2 text-sm">{data.commissions.map((c) => <li key={c.status} className="flex justify-between"><span>{c.status} ({c.count})</span><b className="tabular-nums">{money(c.amount)}</b></li>)}</ul>
          )}
        </Card>
      </div>
    </>
  );
}
