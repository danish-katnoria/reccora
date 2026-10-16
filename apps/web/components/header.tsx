'use client';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { Avatar } from './img';
import { useApp } from './providers';

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="Reccora home">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent font-display text-lg font-bold text-white">R</span>
      <span className={`font-display text-2xl font-semibold tracking-tight ${light ? 'text-white' : ''}`}>Reccora</span>
    </Link>
  );
}

function SearchBox() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  useEffect(() => { setQ(params.get('q') ?? ''); }, [params]);
  return (
    <form role="search" onSubmit={(e) => { e.preventDefault(); router.push(`/explore${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`); }} className="relative w-full">
      <svg className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products, creators, brands…" aria-label="Search" className="w-full rounded-full border border-line bg-surface py-2.5 pl-11 pr-4 text-sm outline-none transition focus:border-ink" />
    </form>
  );
}

function UserMenu() {
  const { user, ready, logout } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  if (!ready) return <div className="skeleton h-10 w-24 rounded-full" aria-hidden />;
  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login" className="rounded-full px-4 py-2 text-sm font-semibold hover:bg-sand">Sign in</Link>
        <Link href="/register" className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-black">Join</Link>
      </div>
    );
  }
  const item = 'block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-sand';
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3 hover:border-ink">
        <Avatar src={user.avatarUrl} name={user.displayName} size={32} />
        <span className="hidden max-w-[7rem] truncate text-sm font-semibold sm:block">{user.displayName.split(' ')[0]}</span>
      </button>
      {open && (
        <div role="menu" className="rise absolute right-0 top-12 z-50 w-56 rounded-2xl border border-line bg-surface p-2 shadow-lift">
          <div className="px-3 py-2"><p className="truncate text-sm font-semibold">{user.displayName}</p><p className="truncate text-xs text-muted">{user.email}</p></div>
          <hr className="my-1 border-line" />
          {user.creatorProfile && <>
            <Link role="menuitem" href="/creator" className={item}>Creator studio</Link>
            <Link role="menuitem" href="/creator/new" className={item}>New recommendation</Link>
            <Link role="menuitem" href={`/c/${user.creatorProfile.handle}`} className={item}>My storefront</Link>
          </>}
          <Link role="menuitem" href="/saved" className={item}>Saved products</Link>
          <Link role="menuitem" href="/profile" className={item}>Profile &amp; settings</Link>
          <hr className="my-1 border-line" />
          <button role="menuitem" onClick={logout} className={`${item} text-bad`}>Sign out</button>
        </div>
      )}
    </div>
  );
}

const nav = [{ href: '/explore', label: 'Explore' }, { href: '/explore?tab=creators', label: 'Creators' }, { href: '/saved', label: 'Saved' }];

export function Header() {
  const { user } = useApp();
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/85 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
        <Logo />
        <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Main">
          {nav.map((n) => <Link key={n.label} href={n.href} className="rounded-full px-4 py-2 text-sm font-medium text-muted hover:bg-sand hover:text-ink">{n.label}</Link>)}
        </nav>
        <div className="mx-auto hidden w-full max-w-md md:block"><Suspense fallback={<div className="h-10" />}><SearchBox /></Suspense></div>
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          {user?.creatorProfile && <Link href="/creator/new" className="hidden rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-deep lg:block">+ Recommend</Link>}
          <UserMenu />
        </div>
      </div>
      <div className="px-4 pb-3 md:hidden"><Suspense fallback={<div className="h-10" />}><SearchBox /></Suspense></div>
    </header>
  );
}
