'use client';
import { useState } from 'react';
import { useApp } from './providers';

export function SaveButton({ productId, variant = 'icon' }: { productId: string; variant?: 'icon' | 'pill' }) {
  const { savedIds, toggleSave } = useApp();
  const [busy, setBusy] = useState(false);
  const [pulse, setPulse] = useState(false);
  const saved = savedIds.has(productId);

  async function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    const r = await toggleSave(productId);
    if (r) { setPulse(true); setTimeout(() => setPulse(false), 300); }
    setBusy(false);
  }
  const heart = (
    <svg width="20" height="20" viewBox="0 0 24 24" className={pulse ? 'pop' : ''} fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 21s-7.5-4.6-9.5-9.3C1.2 8.6 3 5 6.4 5c2 0 3.4 1.1 4.1 2.3h.9C12.1 6.1 13.6 5 15.6 5 19 5 20.8 8.6 21.5 11.7 19.5 16.4 12 21 12 21Z" /></svg>
  );
  if (variant === 'pill') {
    return (
      <button onClick={onClick} aria-pressed={saved} className={`inline-flex items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold transition ${saved ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface text-ink hover:border-ink'}`}>
        {heart}{saved ? 'Saved' : 'Save'}
      </button>
    );
  }
  return (
    <button onClick={onClick} aria-pressed={saved} aria-label={saved ? 'Remove from saved' : 'Save product'} className={`flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow-card backdrop-blur transition hover:scale-105 ${saved ? 'text-accent' : 'text-ink'}`}>
      {heart}
    </button>
  );
}
