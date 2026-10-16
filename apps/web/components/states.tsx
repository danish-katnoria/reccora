import Link from 'next/link';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-2xl ${className}`} aria-hidden />;
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4" aria-busy aria-label="Loading products">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}><Skeleton className="aspect-[4/5] w-full" /><Skeleton className="mt-3 h-4 w-3/4" /><Skeleton className="mt-2 h-4 w-1/3" /></div>
      ))}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: { href: string; label: string } }) {
  return (
    <div className="rounded-3xl border border-dashed border-line bg-surface px-6 py-16 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent" aria-hidden>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      </div>
      <h3 className="font-display text-xl">{title}</h3>
      {body && <p className="mx-auto mt-2 max-w-sm text-sm text-muted">{body}</p>}
      {action && <Link href={action.href} className="mt-5 inline-flex rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-black">{action.label}</Link>}
    </div>
  );
}

export function ErrorState({ message = 'Something went wrong while loading this.', onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-3xl border border-bad/20 bg-bad/5 px-6 py-12 text-center">
      <h3 className="font-display text-xl text-bad">We couldn’t load that</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted">{message}</p>
      {onRetry && <button onClick={onRetry} className="mt-5 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-black">Try again</button>}
    </div>
  );
}

export function SectionHeader({ title, href, eyebrow, linkLabel = 'See all' }: { title: string; href?: string; eyebrow?: string; linkLabel?: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-accent">{eyebrow}</p>}
        <h2 className="font-display text-2xl sm:text-3xl">{title}</h2>
      </div>
      {href && <Link href={href} className="shrink-0 text-sm font-semibold text-ink underline decoration-line decoration-2 underline-offset-4 hover:decoration-accent">{linkLabel}</Link>}
    </div>
  );
}
