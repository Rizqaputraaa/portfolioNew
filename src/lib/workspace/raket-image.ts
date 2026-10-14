import { imageSize } from 'image-size';

/**
 * Finds the largest product photo behind a racket's product link, so the owner gets a high-resolution
 * original to cut out by hand. No guessing about angles: the biggest image wins.
 */

export interface Candidate { url: string; width: number; height: number; source: 'shopify' | 'meta' | 'page' }
export interface FoundImage extends Candidate { bytes: Buffer; mime: string }

const UA = 'Mozilla/5.0 (compatible; Mozilla/5.0; +https://rizqaputra.site)';
const PAGE_TIMEOUT = 12_000;
const IMAGE_TIMEOUT = 15_000;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MIN_USEFUL = 600; // shorter side, px: meta images below this lose to anything bigger on the page

export class RaketImageError extends Error {}

/** Only public http(s) addresses: this endpoint fetches whatever link was typed into a brief. */
export function assertPublicUrl(input: string): URL {
  let u: URL;
  try { u = new URL(input); } catch { throw new RaketImageError('Link tidak valid'); }
  if (!['http:', 'https:'].includes(u.protocol)) throw new RaketImageError('Link harus http atau https');
  const h = u.hostname.toLowerCase();
  const privateHost = h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')
    || /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h) || h === '::1' || h.startsWith('[');
  if (privateHost || !h.includes('.')) throw new RaketImageError('Alamat ini tidak diizinkan');
  return u;
}

async function get(url: string, opts: { timeout: number; range?: string; accept?: string }): Promise<Response> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), opts.timeout);
  try {
    return await fetch(url, {
      signal: ctl.signal,
      redirect: 'follow',
      headers: { 'User-Agent': UA, Accept: opts.accept ?? '*/*', ...(opts.range ? { Range: opts.range } : {}) },
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Shopify serves the original unless a size parameter asks for a smaller copy. */
function originalOf(src: string): string {
  try {
    const u = new URL(src);
    for (const k of ['width', 'height', 'w', 'h', 'crop']) u.searchParams.delete(k);
    return u.toString();
  } catch { return src; }
}

function absolute(src: string, base: URL): string | null {
  try {
    const u = new URL(src.replace(/&amp;/g, '&'), base);
    return ['http:', 'https:'].includes(u.protocol) ? u.toString() : null;
  } catch { return null; }
}

async function shopifyCandidates(page: URL): Promise<Candidate[]> {
  if (!/\/products\/[^/]+/.test(page.pathname)) return [];
  const json = new URL(page.origin + page.pathname.replace(/\/$/, '') + '.json');
  try {
    const res = await get(json.toString(), { timeout: PAGE_TIMEOUT, accept: 'application/json' });
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('json')) return [];
    const data = await res.json() as { product?: { images?: { src?: string; width?: number; height?: number }[] } };
    return (data.product?.images ?? [])
      .filter(i => i.src && i.width && i.height)
      .map(i => ({ url: originalOf(i.src as string), width: i.width as number, height: i.height as number, source: 'shopify' as const }));
  } catch { return []; }
}

function htmlUrls(html: string, base: URL): { meta: string[]; page: string[] } {
  const meta = new Set<string>();
  const page = new Set<string>();
  const add = (set: Set<string>, raw: string | undefined) => { const u = raw && absolute(raw.trim(), base); if (u) set.add(u); };

  for (const m of Array.from(html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image)["'][^>]*>/gi))) {
    add(meta, /content=["']([^"']+)["']/i.exec(m[0])?.[1]);
  }
  for (const m of Array.from(html.matchAll(/<link[^>]+rel=["']image_src["'][^>]*>/gi))) add(meta, /href=["']([^"']+)["']/i.exec(m[0])?.[1]);
  for (const m of Array.from(html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi))) {
    for (const im of Array.from(m[1].matchAll(/"image"\s*:\s*(\[[^\]]*\]|"[^"]+"|\{[^}]*\})/g))) {
      for (const u of Array.from(im[1].matchAll(/https?:\\?\/\\?\/[^"\\\s]+(?:\\\/[^"\\\s]+)*/g))) add(meta, u[0].replace(/\\\//g, '/'));
    }
  }
  for (const m of Array.from(html.matchAll(/<img[^>]+>/gi))) {
    const tag = m[0];
    const srcset = /(?:data-)?srcset=["']([^"']+)["']/i.exec(tag)?.[1];
    if (srcset) {
      // the widest entry of a srcset is the largest copy the page offers
      const best = srcset.split(',').map(s => s.trim().split(/\s+/)).sort((a, b) => parseInt(b[1] ?? '0') - parseInt(a[1] ?? '0'))[0];
      add(page, best?.[0]);
    }
    add(page, /data-(?:zoom-)?(?:src|original|large)=["']([^"']+)["']/i.exec(tag)?.[1]);
    add(page, /\ssrc=["']([^"']+)["']/i.exec(tag)?.[1]);
  }
  const noise = /(logo|icon|sprite|favicon|avatar|badge|payment|flag|placeholder|loading|pixel|banner|\.svg|\.gif)(?![a-z])/i;
  return { meta: Array.from(meta).filter(u => !noise.test(u)), page: Array.from(page).filter(u => !noise.test(u)).slice(0, 24) };
}

/** Pixel size of an image from just its first bytes (no full download). */
async function probe(url: string): Promise<{ width: number; height: number } | null> {
  try {
    const res = await get(url, { timeout: IMAGE_TIMEOUT, range: 'bytes=0-131071', accept: 'image/*' });
    if (!res.ok && res.status !== 206) return null;
    if (!(res.headers.get('content-type') ?? '').startsWith('image/')) return null;
    const head = Buffer.from(await res.arrayBuffer()).subarray(0, 131072);
    const dim = imageSize(head);
    return dim.width && dim.height ? { width: dim.width, height: dim.height } : null;
  } catch { return null; }
}

async function withDimensions(urls: string[], source: Candidate['source']): Promise<Candidate[]> {
  const out: Candidate[] = [];
  for (let i = 0; i < urls.length; i += 4) {
    const batch = await Promise.all(urls.slice(i, i + 4).map(async url => {
      const d = await probe(url);
      return d ? { url, ...d, source } : null;
    }));
    out.push(...batch.filter((x): x is Candidate => !!x));
  }
  return out;
}

const shorter = (c: Candidate) => Math.min(c.width, c.height);
// Biggest shorter side first; equal sizes keep the page's own order, where the main product photo comes first
// (a wide campaign photo is not preferred over the packshot just because it is wider).
const bySize = (a: Candidate, b: Candidate) => shorter(b) - shorter(a);

/** Every image candidate found for a product link, biggest first. */
export async function findCandidates(link: string): Promise<Candidate[]> {
  const page = assertPublicUrl(link);

  // The link may already be a direct image.
  if (/\.(jpe?g|png|webp)(\?|$)/i.test(page.pathname + page.search)) {
    const d = await probe(page.toString());
    return d ? [{ url: page.toString(), ...d, source: 'meta' }] : [];
  }

  const shopify = await shopifyCandidates(page);
  if (shopify.length) return shopify.sort(bySize);

  let html = '';
  try {
    const res = await get(page.toString(), { timeout: PAGE_TIMEOUT, accept: 'text/html' });
    if (!res.ok) throw new RaketImageError(`Halaman produk tidak bisa dibuka (${res.status})`);
    if ((res.headers.get('content-type') ?? '').startsWith('image/')) {
      // the link itself is an image, just without a file extension in the address
      const dim = imageSize(Buffer.from(await res.arrayBuffer()));
      return dim.width && dim.height ? [{ url: page.toString(), width: dim.width, height: dim.height, source: 'meta' }] : [];
    }
    html = (await res.text()).slice(0, 2_500_000);
  } catch (e) {
    if (e instanceof RaketImageError) throw e;
    throw new RaketImageError('Halaman produk tidak bisa dibuka');
  }

  const urls = htmlUrls(html, page);
  // Meta images describe the product itself; only fall back to the rest of the page if they are too small.
  const meta = await withDimensions(urls.meta.map(originalOf), 'meta');
  if (meta.some(c => shorter(c) >= MIN_USEFUL)) return meta.sort(bySize);
  const rest = await withDimensions(urls.page.filter(u => !urls.meta.includes(u)).slice(0, 16), 'page');
  return [...meta, ...rest].sort(bySize);
}

/** Largest image behind a product link, downloaded in full (or the next-largest when `rank` > 0). */
export async function fetchLargestImage(link: string, rank = 0): Promise<FoundImage> {
  const found = await findCandidates(link);
  if (!found.length) throw new RaketImageError('Tidak ada gambar yang ditemukan di link ini');
  // rank 0 = the largest; each "gambar lain" moves one place down the list (and wraps around)
  const start = ((Math.floor(rank) % found.length) + found.length) % found.length;
  const candidates = [...found.slice(start), ...found.slice(0, start)];

  for (const c of candidates.slice(0, 3)) {
    try {
      const res = await get(c.url, { timeout: 25_000, accept: 'image/*' });
      const mime = (res.headers.get('content-type') ?? '').split(';')[0].trim();
      if (!res.ok || !mime.startsWith('image/')) continue;
      const bytes = Buffer.from(await res.arrayBuffer());
      if (bytes.length > MAX_IMAGE_BYTES) continue;
      const dim = imageSize(bytes);
      return { ...c, width: dim.width ?? c.width, height: dim.height ?? c.height, bytes, mime };
    } catch { /* try the next biggest */ }
  }
  throw new RaketImageError('Gambar terbesar tidak bisa diunduh');
}

export const nameKey = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');
