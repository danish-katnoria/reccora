const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

/** Only http(s) URLs may be rendered into href/src attributes. */
const safeUrl = (u: unknown) => (typeof u === 'string' && /^https?:\/\//i.test(u) ? esc(u) : '');

interface PageData {
  creator: { displayName: string; handle: string; bio?: string | null; avatarUrl?: string | null; followerCount: number; storefrontUrl: string };
  products: { id: string; title: string; price: number; currency: string; merchantName: string; imageUrl: string | null; purchasable: boolean }[];
}

export function renderStorefront(d: PageData, apiBase: string): string {
  const { creator: c } = d;
  const price = (p: { price: number; currency: string }) => {
    try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: p.currency }).format(p.price); } catch { return `${p.currency} ${p.price}`; }
  };
  const cards = d.products
    .map((p) => {
      const href = `${apiBase}/api/v1/go/${encodeURIComponent(p.id)}?creator=${encodeURIComponent(c.handle)}&source=web`;
      return `<article class="card">
  ${p.imageUrl ? `<img src="${safeUrl(p.imageUrl)}" alt="${esc(p.title)}" loading="lazy">` : '<div class="ph"></div>'}
  <h2>${esc(p.title)}</h2>
  <p class="meta">${esc(p.merchantName)}</p>
  <p class="price">${esc(price(p))}</p>
  ${p.purchasable ? `<a class="btn" href="${esc(href)}" rel="sponsored nofollow noopener" target="_blank">Buy at ${esc(p.merchantName)}</a>` : '<span class="btn off">Unavailable</span>'}
</article>`;
    })
    .join('\n');
  const desc = c.bio ? c.bio.slice(0, 160) : `Shop ${c.displayName}'s recommendations on Reccora`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(c.displayName)} (@${esc(c.handle)}) · Reccora</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(c.displayName)} on Reccora"><meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="profile">${c.avatarUrl ? `<meta property="og:image" content="${safeUrl(c.avatarUrl)}">` : ''}
<meta name="robots" content="index,follow">
<style>
:root{--bg:#faf8f5;--ink:#14110f;--muted:#6b645d;--line:#e9e4dd;--accent:#e8472b}
@media(prefers-color-scheme:dark){:root{--bg:#14110f;--ink:#faf8f5;--muted:#a39b92;--line:#2b2622}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
header{max-width:960px;margin:0 auto;padding:32px 16px;text-align:center}
.av{width:96px;height:96px;border-radius:50%;object-fit:cover;background:var(--line)}
h1{margin:12px 0 0;font-size:26px}.sub{color:var(--muted);margin:2px 0}
main{max-width:960px;margin:0 auto;padding:0 16px 48px;display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:16px}
.card{background:transparent}.card img,.ph{width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:16px;background:var(--line);display:block}
.card h2{font-size:15px;margin:8px 0 0}.meta{color:var(--muted);margin:0;font-size:13px}.price{color:var(--accent);font-weight:700;margin:2px 0 8px}
.btn{display:inline-block;background:var(--accent);color:#fff;text-decoration:none;font-weight:600;padding:10px 16px;border-radius:999px;font-size:14px}.btn.off{background:var(--line);color:var(--muted)}
footer{text-align:center;color:var(--muted);font-size:13px;padding:24px 16px}
</style></head><body>
<header>
${c.avatarUrl ? `<img class="av" src="${safeUrl(c.avatarUrl)}" alt="">` : '<div class="av" style="display:inline-block"></div>'}
<h1>${esc(c.displayName)}</h1><p class="sub">@${esc(c.handle)} · ${esc(c.followerCount)} followers</p>
${c.bio ? `<p>${esc(c.bio)}</p>` : ''}
</header>
<main>${cards || '<p class="sub">No products yet.</p>'}</main>
<footer>Purchases are completed on the merchant's website. Reccora may earn a commission from qualifying purchases.</footer>
</body></html>`;
}
