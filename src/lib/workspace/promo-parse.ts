/**
 * Turns whatever a client has (an Excel sheet, a Word table, a PDF, a pasted WhatsApp list) into promo rows.
 * No AI: plain rules. Everything is shown to the client for correction before it is sent, so a wrong guess
 * costs one edit instead of a wrong list. Self-contained on purpose (no imports) so it is easy to test.
 */

export interface ParsedRow {
  name: string;
  original: string; // typed like people say it: "4.500" = Rp4.500.000
  promo: string;
  image: string;
}

export interface ParseResult {
  rows: ParsedRow[];
  title: string;
}

/** One line of the source: the cells of a table row, or a single cell for plain text. */
export type Cells = (string | number | null | undefined)[];

const URL_RE = /(?:https?:\/\/|www\.)[^\s<>"')\]]+/gi;
const PRICE_TOKEN = /(?:rp\.?\s*)?\d+(?:[.,]\d+)*\s*(?:jt|juta|rb|ribu|k)\b|(?:rp\.?\s*)?\d{1,3}(?:[.,]\d{3})+(?![\d])|(?:rp\.?\s*)\d+|(?<![\w.,])\d{4,}(?![\w])/gi;

const HEADER_NAME = /(nama|raket|produk|product|item|barang|name|model|tipe|type)/i;
const HEADER_ORIGINAL = /(awal|normal|asli|coret|sebelum|before|retail|original|reguler|regular|ofc|srp)/i;
const HEADER_PROMO = /(promo|diskon|discount|sale|setelah|after|jual|special|spesial|harga)/i;
const HEADER_IMAGE = /(link|gambar|foto|image|img|url|photo|pic)/i;

/** "4300000" -> "4.300": whole thousands are shown the way people type them; anything else stays as digits. */
function shortPrice(digits: string): string {
  const n = Number(digits);
  if (!Number.isFinite(n) || n < 100_000 || n % 1000 !== 0) return digits;
  return String(n / 1000).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** A price written any way people write it, as the "thousands" string the form expects. */
function toThousands(token: string): string | null {
  const t = token.trim().toLowerCase().replace(/^rp\.?\s*/, '');
  const suffix = t.match(/(jt|juta|rb|ribu|k)$/);
  if (suffix) {
    const num = Number(t.slice(0, -suffix[1].length).trim().replace(',', '.'));
    if (!Number.isFinite(num) || num <= 0) return null;
    const rupiah = suffix[1] === 'jt' || suffix[1] === 'juta' ? num * 1_000_000 : num * 1000;
    return String(Math.round(rupiah / 1000));
  }
  const digits = t.replace(/\D/g, '');
  if (!digits) return null;
  return shortPrice(digits); // "3.949" -> 3949 (read as thousands), "3.949.000" -> "3.949" too
}

/** Amount in rupiah, only to decide which of two prices is the larger one. */
function amount(s: string): number {
  const n = Number(s);
  return n < 100_000 ? n * 1000 : n;
}

const cellText = (c: unknown) => (c === null || c === undefined ? '' : String(c)).replace(/\s+/g, ' ').trim();

function cleanName(s: string): string {
  let out = s
    .replace(/\(\s*(?:normal|coret|awal|asli|dari|harga|was|promo)?\s*[:=]?\s*\)/gi, ' ') // "(normal )" left by a removed price
    .replace(/^[\s\-–—•*·>#]+/, '')
    .replace(/^\(?\d{1,3}\s*[.)\]:]\s+/, ''); // "1. " / "2) " numbering
  // Words that only introduce a price ("promo", "coret", "normal") are dropped from the end of the name.
  for (let i = 0; i < 4; i++) {
    out = out
      .replace(/[\s\-–—:=|@~,;(>→]+$/g, '')
      .replace(/\b(?:harga|promo|diskon|rp|normal|coret|awal|asli|dari|jadi|sale|was)\b\.?$/i, '');
  }
  return out.replace(/\s{2,}/g, ' ').trim();
}

interface Pieces { text: string; prices: string[]; urls: string[] }

/** Splits one piece of text into its name part, prices and links. */
function dissect(raw: string): Pieces {
  let text = raw;
  const urls: string[] = [];
  text = text.replace(URL_RE, m => { urls.push(m.replace(/[.,;]+$/, '')); return ' '; });
  const prices: string[] = [];
  text = text.replace(PRICE_TOKEN, m => {
    if (/^(?:19|20)\d{2}$/.test(m.trim())) return m; // a model year ("Pure Drive 2024"), not a price
    const v = toThousands(m);
    if (v) prices.push(v);
    return ' ';
  });
  return { text: cleanName(text), prices, urls };
}

function pickPrices(prices: string[]): { original: string; promo: string } {
  if (prices.length === 0) return { original: '', promo: '' };
  if (prices.length === 1) return { original: '', promo: prices[0] };
  const sorted = [...prices].sort((a, b) => amount(b) - amount(a));
  // Two or more prices: the biggest is the price before the promo, the smallest is the promo itself.
  return { original: sorted[0], promo: sorted[sorted.length - 1] };
}

interface Columns { name: number; original: number; promo: number; image: number }

/** A first row made of column titles ("Nama Raket | Harga Awal | Harga Promo | Link"). */
function detectHeader(rows: string[][]): { columns: Columns; index: number } | null {
  for (let r = 0; r < Math.min(rows.length, 6); r++) {
    const cells = rows[r];
    if (cells.filter(Boolean).length < 2) continue;
    if (cells.some(c => /\d{3,}/.test(c) || URL_RE.test(c))) { URL_RE.lastIndex = 0; continue; }
    URL_RE.lastIndex = 0;
    const cols: Columns = { name: -1, original: -1, promo: -1, image: -1 };
    cells.forEach((c, i) => {
      if (!c) return;
      if (HEADER_IMAGE.test(c) && cols.image < 0) cols.image = i;
      else if (HEADER_ORIGINAL.test(c) && cols.original < 0) cols.original = i;
      else if (HEADER_PROMO.test(c) && cols.promo < 0) cols.promo = i;
      else if (HEADER_NAME.test(c) && cols.name < 0) cols.name = i;
    });
    // A header must name at least the racket column and one other column.
    if (cols.name >= 0 && (cols.promo >= 0 || cols.original >= 0 || cols.image >= 0)) return { columns: cols, index: r };
  }
  return null;
}

function fromHeaderRow(cells: string[], cols: Columns): ParsedRow | null {
  const name = cleanName(cells[cols.name] ?? '');
  if (!name || !/[a-z]/i.test(name)) return null;
  const price = (i: number) => (i < 0 ? '' : toThousandsLoose(cells[i] ?? ''));
  const imageCell = cols.image >= 0 ? cells[cols.image] ?? '' : '';
  const image = (imageCell.match(URL_RE) ?? [])[0] ?? '';
  URL_RE.lastIndex = 0;
  return { name, original: price(cols.original), promo: price(cols.promo), image: image.replace(/[.,;]+$/, '') };
}

/** Inside a column titled "Harga" any number is a price, even a bare "3949" or "3.9 jt". */
function toThousandsLoose(cell: string): string {
  const t = cell.trim();
  if (!t) return '';
  const viaSuffix = t.match(/\d[\d.,]*\s*(?:jt|juta|rb|ribu|k)\b/i);
  if (viaSuffix) return toThousands(viaSuffix[0]) ?? '';
  const digits = t.replace(/\D/g, '');
  return digits ? shortPrice(digits) : '';
}

/** Row without a header: sort each cell into link, price or name. */
function fromLooseRow(cells: string[]): { name: string; prices: string[]; urls: string[] } {
  const names: string[] = [];
  const prices: string[] = [];
  const urls: string[] = [];
  for (const cell of cells) {
    if (!cell) continue;
    const d = dissect(cell);
    urls.push(...d.urls);
    prices.push(...d.prices);
    if (d.text && /[a-z]/i.test(d.text)) names.push(d.text);
  }
  return { name: names.join(' ').replace(/\s{2,}/g, ' ').trim(), prices, urls };
}

export function parsePromoRows(input: Cells[], maxRows = 200): ParseResult {
  const grid = input
    .map(row => row.map(cellText))
    .filter(row => row.some(Boolean));

  const header = detectHeader(grid);
  const out: ParsedRow[] = [];
  let title = '';

  if (header) {
    for (const cells of grid.slice(header.index + 1)) {
      const row = fromHeaderRow(cells, header.columns);
      if (row) out.push(row);
    }
    return { rows: out.slice(0, maxRows), title };
  }

  // Loose lines. A name-only line right before priced lines is more often a heading than a racket.
  const parsed = grid.map(fromLooseRow);
  const pricedCount = parsed.filter(p => p.prices.length > 0).length;

  parsed.forEach((p, i) => {
    // "Product Link :" and similar are labels for the link next to them, never a racket.
    const isLabel = p.name.split(/\s+/).length <= 3 && !/\d/.test(p.name) && /\b(?:link|url|gambar|foto|image|img)\b/i.test(p.name);
    const hasName = !!p.name && !isLabel;
    const prev = out[out.length - 1];

    if (!hasName) {
      // A line holding only a price or a link belongs to the racket above it.
      if (prev) {
        if (!prev.promo && p.prices.length) {
          const { original, promo } = pickPrices(p.prices);
          prev.promo = promo;
          if (!prev.original) prev.original = original;
        }
        if (!prev.image && p.urls.length) prev.image = p.urls[0];
      }
      return;
    }

    if (i === 0 && p.prices.length === 0 && p.urls.length === 0 && pricedCount >= 2 && !title) {
      title = p.name.slice(0, 80);
      return;
    }

    // A short ALL-CAPS line without price or link ("ADIDAS", "LIMITED TIME OFFER") is a heading between groups.
    if (p.prices.length === 0 && p.urls.length === 0 && pricedCount >= 2
      && p.name === p.name.toUpperCase() && p.name.split(/\s+/).length <= 5) return;

    const { original, promo } = pickPrices(p.prices);
    out.push({ name: p.name.slice(0, 140), original, promo, image: p.urls[0] ?? '' });
  });

  return { rows: out.slice(0, maxRows), title };
}

/** Plain text (txt, PDF, Word): every line is a row, tabs separate cells. */
export function textToCells(text: string): Cells[] {
  return text
    .replace(/\r/g, '')
    .split('\n')
    .map(line => (line.includes('\t') ? line.split('\t') : [line]))
    .filter(cells => cells.some(c => String(c).trim()));
}

/** Small CSV reader: quotes, and a delimiter picked from the first line (; , or tab). */
export function csvToCells(text: string): Cells[] {
  const clean = text.replace(/^﻿/, '').replace(/\r/g, '');
  const first = clean.split('\n').find(l => l.trim()) ?? '';
  const delimiter = [';', '\t', ','].map(d => ({ d, n: first.split(d).length })).sort((a, b) => b.n - a.n)[0].d;
  const rows: Cells[] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  row.push(cell);
  rows.push(row);
  return rows.filter(r => r.some(c => String(c ?? '').trim()));
}
