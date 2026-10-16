import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-32 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-accent">404</p>
      <h1 className="font-display mt-2 text-4xl">We couldn’t find that page</h1>
      <p className="mt-3 text-muted">It may have been removed or the link is incorrect.</p>
      <Link href="/explore" className="mt-8 inline-flex rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white hover:bg-black">Explore products</Link>
    </div>
  );
}
