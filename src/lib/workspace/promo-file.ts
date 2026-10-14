import { csvToCells, parsePromoRows, textToCells, type Cells, type ParseResult } from './promo-parse';
import { MAX_PROMO_ITEMS } from './promo';

/** Server side: read an uploaded list (Excel, Word, PDF, CSV, TXT) into promo rows. Throws a message fit to show. */
export const MAX_LIST_BYTES = 5 * 1024 * 1024;

const decodeEntities = (s: string) =>
  s.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

/** Word: tables keep their cells (tab separated), links keep their address. */
async function wordCells(buffer: Buffer): Promise<Cells[]> {
  const mammoth = (await import('mammoth')).default;
  const { value: html } = await mammoth.convertToHtml({ buffer });
  const text = html
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, label: string) => (label.includes(href) ? label : `${label} ${href}`))
    .replace(/<\/t[dh]>\s*/gi, '\t')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/(p|li|h[1-6]|div)>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  return textToCells(decodeEntities(text));
}

async function pdfCells(buffer: Buffer): Promise<Cells[]> {
  const { extractText, getDocumentProxy } = await import('unpdf');
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return textToCells(String(text));
}

async function excelCells(buffer: Buffer): Promise<Cells[]> {
  const { default: readXlsx } = await import('read-excel-file/node');
  const sheets = await readXlsx(buffer);
  const first = sheets.find(s => s.data.some(row => row.some(c => c !== null && c !== ''))) ?? sheets[0];
  return (first?.data ?? []) as Cells[];
}

export class ListFileError extends Error {}

export async function readPromoFile(file: File): Promise<ParseResult> {
  if (file.size === 0) throw new ListFileError('File kosong');
  if (file.size > MAX_LIST_BYTES) throw new ListFileError('File terlalu besar (maksimal 5 MB)');

  const ext = (file.name.split('.').pop() ?? '').toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  let cells: Cells[];
  try {
    if (ext === 'xlsx') cells = await excelCells(buffer);
    else if (ext === 'docx') cells = await wordCells(buffer);
    else if (ext === 'pdf') cells = await pdfCells(buffer);
    else if (ext === 'csv') cells = csvToCells(buffer.toString('utf8'));
    else if (ext === 'txt') cells = textToCells(buffer.toString('utf8'));
    else if (ext === 'xls' || ext === 'doc') throw new ListFileError(`File .${ext} versi lama belum bisa dibaca. Simpan ulang sebagai .${ext}x lalu upload lagi.`);
    else throw new ListFileError('Format belum didukung. Gunakan Excel (.xlsx), Word (.docx), PDF, CSV, atau TXT.');
  } catch (e) {
    if (e instanceof ListFileError) throw e;
    throw new ListFileError('File tidak bisa dibaca. Pastikan filenya tidak rusak atau diberi password.');
  }

  const result = parsePromoRows(cells, MAX_PROMO_ITEMS);
  if (result.rows.length === 0) {
    throw new ListFileError(ext === 'pdf'
      ? 'Tidak ada teks yang terbaca. PDF hasil scan atau foto tidak bisa dibaca, pakai file Excel atau Word.'
      : 'Tidak ada nama raket yang terbaca di file ini.');
  }
  return result;
}
