'use client';
import { forwardRef } from 'react';

export const Field = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }>(function Field({ label, hint, id, ...props }, ref) {
  const fid = id ?? `f-${label.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <div>
      <label htmlFor={fid} className="mb-1.5 block text-sm font-semibold">{label}</label>
      <input ref={ref} id={fid} {...props} className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-[15px] outline-none transition placeholder:text-muted/60 focus:border-ink" />
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
});

export function TextArea({ label, hint, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string }) {
  const fid = `f-${label.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <div>
      <label htmlFor={fid} className="mb-1.5 block text-sm font-semibold">{label}</label>
      <textarea id={fid} {...props} className="w-full resize-y rounded-2xl border border-line bg-surface px-4 py-3 text-[15px] outline-none transition placeholder:text-muted/60 focus:border-ink" />
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function PrimaryButton({ loading, children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button {...props} disabled={props.disabled || loading} className={`inline-flex items-center justify-center gap-2 rounded-full bg-ink px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60 ${className}`}>
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />}{children}
    </button>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p role="alert" className="rounded-2xl bg-bad/10 px-4 py-3 text-sm text-bad">{message}</p>;
}

export function AuthShell({ title, subtitle, image, children }: { title: string; subtitle: string; image: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto grid min-h-[calc(100vh-8rem)] max-w-6xl items-stretch gap-0 px-4 py-10 sm:px-6 lg:grid-cols-2">
      <div className="relative hidden overflow-hidden rounded-l-[2rem] bg-ink lg:block">
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <p className="font-display absolute bottom-10 left-10 right-10 text-4xl leading-tight text-white">Discover what creators love.</p>
      </div>
      <div className="flex items-center rounded-[2rem] border border-line bg-surface p-8 shadow-card sm:p-12 lg:rounded-l-none">
        <div className="w-full">
          <h1 className="font-display text-4xl">{title}</h1>
          <p className="mb-8 mt-2 text-muted">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
