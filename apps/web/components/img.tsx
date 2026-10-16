'use client';
import { useState } from 'react';
import { initials, sized } from '@/lib/format';

/** Lazy remote image with a tidy fallback tile if the URL fails, so a broken photo never leaves a hole in a grid. */
export function Img({ src, alt, w = 600, h, className = '', priority = false }: { src?: string | null; alt: string; w?: number; h?: number; className?: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <div role="img" aria-label={alt} className={`flex items-center justify-center bg-gradient-to-br from-sand to-line text-muted ${className}`}><span className="font-display text-2xl opacity-60">{initials(alt) || '•'}</span></div>;
  }
  return <img src={sized(src, w, h)} alt={alt} loading={priority ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)} className={`bg-sand object-cover ${className}`} />;
}

export function Avatar({ src, name, size = 40, className = '' }: { src?: string | null; name: string; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size };
  if (!src || failed) {
    return <span style={{ ...style, fontSize: size * 0.38 }} className={`inline-flex shrink-0 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent ${className}`} aria-hidden>{initials(name)}</span>;
  }
  return <img src={sized(src, size * 2, size * 2)} alt="" style={style} loading="lazy" onError={() => setFailed(true)} className={`shrink-0 rounded-full bg-sand object-cover ${className}`} />;
}
