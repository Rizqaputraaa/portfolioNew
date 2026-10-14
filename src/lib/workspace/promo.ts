/** Shared by the client form, the form API and the owner's tool. */

export const MAX_PROMO_ITEMS = 200;
export const MIN_PRICE = 1_000;
export const MAX_PRICE = 1_000_000_000;

/**
 * Prices are written the way people say them: "3.949" or "3,949" means Rp 3.949.000.
 * Anything under 100.000 is read as thousands; a full amount ("3949000") is kept as it is.
 */
export function parseRupiah(input: string): number | null {
  const digits = input.replace(/\D/g, '');
  if (!digits) return null;
  const n = Number(digits);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n < 100_000 ? n * 1000 : n;
}

export const fmtRupiah = (n: number) => `Rp${Math.round(n).toLocaleString('id-ID')}`;

/** "3.895 K" as printed on the feed. */
export const fmtShort = (n: number) => `${Math.round(n / 1000).toLocaleString('id-ID')} K`;

/** Accepts http(s) links only; adds https:// when the client forgot it. */
export function cleanUrl(input: unknown): string | null {
  let url = String(input ?? '').trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  try {
    const u = new URL(url);
    if (!['http:', 'https:'].includes(u.protocol) || !u.hostname.includes('.')) return null;
    return u.toString().slice(0, 600);
  } catch {
    return null;
  }
}

export interface CleanItem {
  name: string;
  price_original: number | null;
  price_promo: number | null;
  image_url: string | null;
}

/**
 * Validates a racket list sent by the browser, so a hand-made request cannot store anything the editor would
 * not have allowed. Fully empty rows are dropped; only the name is required, prices and link are optional.
 */
export function cleanItems(input: unknown): { items: CleanItem[] } | { error: string } {
  const raw = Array.isArray(input) ? input : [];
  if (raw.length > MAX_PROMO_ITEMS) return { error: `Maksimal ${MAX_PROMO_ITEMS} raket per feed` };
  const items: CleanItem[] = [];
  for (let i = 0; i < raw.length; i++) {
    const r = (raw[i] ?? {}) as Record<string, unknown>;
    const name = String(r.name ?? '').trim().slice(0, 140);
    const price = (v: unknown) => (v == null || v === '' ? null : Number(v));
    const original = price(r.price_original);
    const promo = price(r.price_promo);
    const imageRaw = String(r.image_url ?? '').trim();
    if (!name && original === null && promo === null && !imageRaw) continue;
    if (!name) return { error: `Raket ${i + 1}: nama belum diisi` };
    for (const [label, v] of [['harga awal', original], ['harga promo', promo]] as const) {
      if (v !== null && (!Number.isFinite(v) || v < MIN_PRICE || v > MAX_PRICE)) return { error: `${name}: ${label} tidak valid` };
    }
    const image = cleanUrl(imageRaw);
    if (imageRaw && !image) return { error: `${name}: link gambar tidak valid` };
    items.push({
      name,
      price_original: original === null ? null : Math.round(original),
      price_promo: promo === null ? null : Math.round(promo),
      image_url: image,
    });
  }
  return { items };
}
