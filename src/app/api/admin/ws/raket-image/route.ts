import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/workspace/admin';
import { cleanUrl } from '@/lib/workspace/promo';
import { RaketImageError } from '@/lib/workspace/raket-image';
import { deleteRacketAsset, saveRacketImage } from '@/lib/workspace/raket-assets';

export const runtime = 'nodejs';
export const maxDuration = 60;

const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

// Takes the largest product photo behind a racket's link and keeps the original in the library.
// Without `force`, a racket that already has an image is left alone.
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return fail('Tidak diizinkan', 401);
  const { client } = admin;

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? '').trim().slice(0, 140);
  const url = cleanUrl(body.url);
  const itemId = typeof body.itemId === 'string' ? body.itemId : '';
  if (!name) return fail('Nama raket kosong');
  if (!url) return fail(String(body.url ?? '').trim() ? 'Link tidak valid' : 'Raket ini belum punya link gambar');

  try {
    const result = await saveRacketImage(client, { name, url, force: body.force === true, rank: Number(body.rank) || 0 });
    // A changed link is kept on the racket in its brief, so the brief itself uses the new one too.
    if (itemId && !result.kept) await client.from('ws_feed_items').update({ image_url: url }).eq('id', itemId);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof RaketImageError) return fail(e.message);
    return fail('Gagal mengambil gambar', 500);
  }
}

// Remove an image from the library (the racket itself stays in its brief).
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return fail('Tidak diizinkan', 401);
  const ok = await deleteRacketAsset(admin.client, req.nextUrl.searchParams.get('id') ?? '');
  return ok ? NextResponse.json({ ok: true }) : fail('Gambar tidak ditemukan', 404);
}
