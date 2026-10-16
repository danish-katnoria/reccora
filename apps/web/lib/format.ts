export const money = (n: number | string, currency = 'USD') => {
  try {
    const v = Number(n);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: v % 1 === 0 ? 0 : 2 }).format(v);
  } catch {
    return `${currency} ${n}`;
  }
};

export const compact = (n: number) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

export const timeAgo = (iso: string | null | undefined) => {
  if (!iso) return '';
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  const units: [number, string][] = [[31536000, 'y'], [2592000, 'mo'], [604800, 'w'], [86400, 'd'], [3600, 'h'], [60, 'm']];
  for (const [sec, label] of units) if (s >= sec) return `${Math.floor(s / sec)}${label} ago`;
  return 'just now';
};

export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');

/**
 * Resize Unsplash-hosted images on the fly (their CDN supports w/h/fit); any other host is returned unchanged.
 * Keeps grids light while detail pages request larger renditions.
 */
export function sized(url: string | null | undefined, w: number, h?: number): string {
  if (!url) return '';
  if (!url.startsWith('https://images.unsplash.com/')) return url;
  const u = new URL(url);
  u.searchParams.set('w', String(w));
  if (h) u.searchParams.set('h', String(h)); else u.searchParams.delete('h');
  u.searchParams.set('fit', 'crop');
  u.searchParams.set('auto', 'format');
  return u.toString();
}
