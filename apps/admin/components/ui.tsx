'use client';
import { ReactNode, useEffect } from 'react';
import { ApiError, Paginated } from '@/lib/api';

export function Button({ variant = 'primary', className = '', ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) {
  const styles = {
    primary: 'bg-accent text-accent-ink hover:brightness-95',
    secondary: 'bg-surface border border-line text-ink hover:bg-bg',
    danger: 'bg-bad text-white hover:brightness-95',
    ghost: 'text-muted hover:text-ink hover:bg-bg',
  }[variant];
  return <button {...p} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`} />;
}

export const Input = (p: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...p} className={`min-h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm placeholder:text-muted ${p.className ?? ''}`} />
);
export const Select = (p: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...p} className={`min-h-10 rounded-xl border border-line bg-surface px-3 text-sm ${p.className ?? ''}`} />
);
export const Textarea = (p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...p} className={`w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm ${p.className ?? ''}`} />
);

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  );
}

const tones = {
  good: 'bg-green-50 text-good', warn: 'bg-amber-50 text-warn', bad: 'bg-red-50 text-bad', neutral: 'bg-bg text-muted border border-line', accent: 'bg-accent-soft text-accent',
};
export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: keyof typeof tones }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

const STATUS_TONE: Record<string, keyof typeof tones> = {
  ACTIVE: 'good', APPROVED: 'good', CONFIRMED: 'good', PAID: 'good', PUBLISHED: 'good', RESOLVED: 'good',
  PENDING: 'warn', DRAFT: 'warn', OPEN: 'warn', REVIEWING: 'warn', PAYABLE: 'accent',
  SUSPENDED: 'bad', DISABLED: 'bad', REMOVED: 'bad', REVERSED: 'bad', REJECTED: 'bad', VOID: 'bad', CANCELLED: 'bad', DELETED: 'bad',
};
export const StatusBadge = ({ status }: { status: string }) => <Badge tone={STATUS_TONE[status] ?? 'neutral'}>{status}</Badge>;

export function Card({ title, action, children, className = '' }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_2px_rgba(20,17,15,0.04)] sm:p-5 ${className}`}>
      {(title || action) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-bad">
      <p className="font-medium">{error.status === 403 ? 'You do not have permission to view this.' : error.message}</p>
      {error.details && <ul className="mt-1 list-disc pl-5">{error.details.map((d) => <li key={d}>{d}</li>)}</ul>}
      {onRetry && <Button variant="secondary" className="mt-3" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export interface Column<T> { header: string; cell: (row: T) => ReactNode; className?: string }

export function DataTable<T extends { id: string }>({ columns, data, loading, error, onRetry, empty = 'Nothing here yet.', onPage }: {
  columns: Column<T>[]; data: Paginated<T> | null; loading: boolean; error: ApiError | null; onRetry?: () => void; empty?: string; onPage: (page: number) => void;
}) {
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-line bg-bg text-xs uppercase tracking-wide text-muted">
            <tr>{columns.map((c) => <th key={c.header} scope="col" className={`px-4 py-3 font-medium ${c.className ?? ''}`}>{c.header}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading && !data && Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>{columns.map((c) => <td key={c.header} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-line" /></td>)}</tr>
            ))}
            {data?.items.map((row) => (
              <tr key={row.id} className="hover:bg-bg/60">
                {columns.map((c) => <td key={c.header} className={`px-4 py-3 align-middle ${c.className ?? ''}`}>{c.cell(row)}</td>)}
              </tr>
            ))}
            {data && data.items.length === 0 && <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-muted">{empty}</td></tr>}
          </tbody>
        </table>
      </div>
      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm">
          <span className="text-muted">Page {data.meta.page} of {data.meta.totalPages} · {data.meta.total} total</span>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={data.meta.page <= 1} onClick={() => onPage(data.meta.page - 1)}>Previous</Button>
            <Button variant="secondary" disabled={!data.meta.hasMore} onClick={() => onPage(data.meta.page + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-surface p-5 shadow-xl sm:max-w-xl sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button variant="ghost" onClick={onClose} aria-label="Close">✕</Button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="mb-4 inline-flex rounded-xl border border-line bg-surface p-1">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
          className={`min-h-9 rounded-lg px-4 text-sm font-medium ${value === t.id ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink'}`}>{t.label}</button>
      ))}
    </div>
  );
}
