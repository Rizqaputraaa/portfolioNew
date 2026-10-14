import { NextRequest, NextResponse } from 'next/server';
import { db, fail, isLead, requireSession } from '@/lib/workspace/server';
import { RaketImageError } from '@/lib/workspace/raket-image';
import { saveRacketImage } from '@/lib/workspace/raket-assets';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Library photo for one racket of a feed's Daftar Raket. The address comes from the racket's own saved link
// (never from the request), and the racket must belong to this workspace.
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const session = requireSession(req, params.slug);
  if (!session) return fail('Belum login', 401);
  if (!isLead(session)) return fail('Tidak punya akses', 403);
  const client = db();
  if (!client) return fail('Server belum siap', 500);

  const body = await req.json().catch(() => ({}));
  const itemId = String(body.itemId ?? '');
  const { data: item } = await client.from('ws_feed_items').select('name, image_url, feed_id').eq('id', itemId).maybeSingle();
  if (!item) return fail('Raket tidak ditemukan', 404);
  const { data: feed } = await client.from('ws_feeds').select('project_id').eq('id', item.feed_id).maybeSingle();
  if (!feed || feed.project_id !== session.pid) return fail('Raket tidak ditemukan', 404);
  if (!item.image_url) return fail('Raket ini belum punya link gambar');

  try {
    const result = await saveRacketImage(client, {
      name: item.name, url: item.image_url, force: body.force === true, rank: Number(body.rank) || 0,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof RaketImageError) return fail(e.message);
    return fail('Gagal mengambil gambar', 500);
  }
}
