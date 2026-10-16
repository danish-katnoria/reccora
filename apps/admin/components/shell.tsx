'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/creators', label: 'Creators' },
  { href: '/users', label: 'Users' },
  { href: '/brands', label: 'Brands' },
  { href: '/products', label: 'Products' },
  { href: '/categories', label: 'Categories' },
  { href: '/moderation', label: 'Moderation' },
  { href: '/tracking', label: 'Tracking' },
  { href: '/commissions', label: 'Commissions' },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  }

  const nav = (
    <nav aria-label="Main" className="flex flex-col gap-1 p-3">
      {NAV.map((n) => {
        const active = n.href === '/' ? path === '/' : path.startsWith(n.href);
        return (
          <Link key={n.href} href={n.href} onClick={() => setOpen(false)} aria-current={active ? 'page' : undefined}
            className={`rounded-xl px-3 py-2.5 text-sm font-medium ${active ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-bg hover:text-ink'}`}>
            {n.label}
          </Link>
        );
      })}
      <button onClick={signOut} className="mt-4 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-muted hover:bg-bg hover:text-ink">Sign out</button>
    </nav>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="hidden border-r border-line bg-surface lg:block">
        <div className="px-6 py-5 text-xl font-bold tracking-tight">Rec<span className="text-accent">cora</span> <span className="text-xs font-medium text-muted">Admin</span></div>
        {nav}
      </aside>
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-surface px-4 py-3 lg:hidden">
        <div className="text-lg font-bold">Rec<span className="text-accent">cora</span> <span className="text-xs font-medium text-muted">Admin</span></div>
        <button aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)} className="min-h-10 rounded-xl border border-line px-3 text-sm">{open ? 'Close' : 'Menu'}</button>
      </header>
      {open && <div className="border-b border-line bg-surface lg:hidden">{nav}</div>}
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-8">{children}</main>
    </div>
  );
}
