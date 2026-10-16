'use client';
import { useApp } from './providers';

export function ShareButton({ url, title, label = 'Share' }: { url?: string; title: string; label?: string }) {
  const { toast } = useApp();
  async function share() {
    const link = url ?? window.location.href;
    try {
      if (navigator.share) { await navigator.share({ title, url: link }); return; }
      await navigator.clipboard.writeText(link);
      toast('Link copied to clipboard');
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') toast('Could not copy the link', 'error');
    }
  }
  return (
    <button onClick={share} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-5 py-2.5 text-sm font-semibold hover:border-ink">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v14" /></svg>
      {label}
    </button>
  );
}
