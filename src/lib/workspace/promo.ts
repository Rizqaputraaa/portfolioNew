/** Shared by the client form, the form API and the owner's tool. */

export interface PromoItemInput {
  name: string;
  priceOriginal: number | null;
  pricePromo: number;
  imageUrl: string | null;
}

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
