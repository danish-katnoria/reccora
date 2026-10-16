'use client';
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-32 text-center" role="alert">
      <h1 className="font-display text-3xl">Something went wrong</h1>
      <p className="mt-3 text-muted">We couldn’t load this page. Please try again in a moment.</p>
      <button onClick={reset} className="mt-8 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white hover:bg-black">Try again</button>
    </div>
  );
}
