import { NextRequest, NextResponse } from 'next/server';
import { BUCKET, db, fail, isLead, requireSession } from '@/lib/workspace/server';
import { deleteRacketAsset } from '@/lib/workspace/raket-assets';

// The original photo of a racket from the library, for the team (designer and Danta) inside a workspace.
// Opens the image, or downloads it with ?download=1. The client never sees library originals.
export async function GET(req: NextRequest, { params }: { params: { slug: string; id: string } }) {
  const session = requireSession(req, params.slug);
  if (!session) return fail('Belum login', 401);
  if (session.role === 'client') return fail('Tidak punya akses', 403);
  const client = db();
  if (!client) return fail('Server belum siap', 500);

  const { data: asset } = await client.from('ws_racket_assets').select('name, image_path').eq('id', params.id).maybeSingle();
  if (!asset) return fail('Gambar tidak ditemukan', 404);

  const ext = (asset.image_path.split('.').pop() ?? 'jpg').toLowerCase();
  const download = req.nextUrl.searchParams.get('download') === '1'
    ? `${String(asset.name).replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim()}.${ext}`
    : undefined;
  const { data, error } = await client.storage.from(BUCKET).createSignedUrl(asset.image_path, 300, download ? { download } : undefined);
  if (error || !data) return fail('Gambar tidak bisa dibuka', 500);
  return NextResponse.redirect(data.signedUrl, 302);
}

// Remove a racket's photo from the library (every feed that lists this racket loses it).
export async function DELETE(req: NextRequest, { params }: { params: { slug: string; id: string } }) {
  const session = requireSession(req, params.slug);
  if (!session) return fail('Belum login', 401);
  if (!isLead(session)) return fail('Tidak punya akses', 403);
  const client = db();
  if (!client) return fail('Server belum siap', 500);
  const ok = await deleteRacketAsset(client, params.id);
  return ok ? NextResponse.json({ ok: true }) : fail('Gambar tidak ditemukan', 404);
}
