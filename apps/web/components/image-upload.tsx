'use client';
import { useRef, useState } from 'react';
import { errorMessage, uploadImage } from '@/lib/client-api';
import { Avatar } from './img';

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX = 10 * 1024 * 1024;

/** Uploads straight to the API (permanent URL) as soon as a file is chosen, then reports the stored URL. */
export function ImageUpload({ value, onChange, purpose, label, shape = 'rect', aspect = 'aspect-[4/5]', name }: { value: string | null; onChange: (url: string | null) => void; purpose: 'avatar' | 'post'; label: string; shape?: 'rect' | 'circle'; aspect?: string; name?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [local, setLocal] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!TYPES.includes(file.type)) return setError('Use a JPEG, PNG or WebP image.');
    if (file.size > MAX) return setError('That image is larger than 10 MB.');
    setError(null); setBusy(true);
    const preview = URL.createObjectURL(file);
    setLocal(preview);
    try {
      onChange(await uploadImage(file, purpose));
    } catch (err) {
      setError(errorMessage(err)); setLocal(null);
    } finally {
      setBusy(false); URL.revokeObjectURL(preview);
    }
  }

  const src = local ?? value;
  const button = (
    <button type="button" onClick={() => input.current?.click()} disabled={busy} className="rounded-full border border-line bg-surface px-5 py-2 text-sm font-semibold hover:border-ink disabled:opacity-60">{busy ? 'Uploading…' : src ? 'Change image' : 'Choose image'}</button>
  );
  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold">{label}</p>
      <input ref={input} type="file" accept={TYPES.join(',')} className="sr-only" onChange={onFile} aria-label={label} />
      {shape === 'circle' ? (
        <div className="flex items-center gap-5"><Avatar src={src} name={name ?? 'You'} size={96} />{button}</div>
      ) : (
        <button type="button" onClick={() => input.current?.click()} disabled={busy} aria-label={src ? `Change ${label}` : `Upload ${label}`} className={`group relative block w-full overflow-hidden rounded-3xl border-2 border-dashed border-line bg-sand transition hover:border-ink ${aspect}`}>
          {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="2" /><path d="m21 16-5-5-8 9" /></svg><span className="text-sm font-medium">Click to upload a photo</span><span className="text-xs">JPEG, PNG or WebP · up to 10 MB</span></span>}
          {busy && <span className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm font-semibold">Uploading…</span>}
          {src && !busy && <span className="absolute bottom-3 right-3 rounded-full bg-white/95 px-4 py-1.5 text-xs font-semibold opacity-0 shadow-card transition group-hover:opacity-100">Change</span>}
        </button>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-bad">{error}</p>}
    </div>
  );
}
