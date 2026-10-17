import { NextRequest, NextResponse } from 'next/server';
import { BUCKET, db, fail, isLead, requireSession, touch } from '@/lib/workspace/server';
import { getFeedDetail } from '@/lib/workspace/feeds';

type Ctx = { params: { slug: string; id: string } };

// Redirects to a short-lived signed URL — but only if this role is allowed to see the file.
// ?download=1 forces a download instead of inline preview.
export async function GET(req: NextRequest, { params }: Ctx) {
  const session = requireSession(req, params.slug);
  if (!session) return fail('Belum login', 401);
  const client = db();
  if (!client) return fail('Server belum siap', 500);

  const { data: file } = await client
    .from('ws_files').select('id, feed_id, path, preview_path, file_name').eq('id', params.id).maybeSingle();
  if (!file) return fail('File tidak ditemukan', 404);

  const { data: feed } = await client
    .from('ws_feeds').select('number, project_id').eq('id', file.feed_id).maybeSingle();
  if (!feed || feed.project_id !== session.pid) return fail('File tidak ditemukan', 404);

  // Reuse the role-filtered feed view as the single source of truth for visibility.
  const detail = await getFeedDetail(client, session.pid, feed.number, session.role, session.role === 'client' && !!session.lead);
  if (!detail?.files.some(f => f.id === file.id)) return fail('Tidak punya akses ke file ini', 403);

  // On-screen viewing uses the small optimised copy when one exists; "download" always gives the original.
  const download = req.nextUrl.searchParams.get('download') === '1';
  const target = !download && file.preview_path ? file.preview_path : file.path;
  const { data, error } = await client.storage
    .from(BUCKET)
    .createSignedUrl(target, 300, download ? { download: file.file_name } : undefined);
  if (error || !data) return fail(error?.message ?? 'Gagal membuat link', 500);

  return NextResponse.redirect(data.signedUrl);
}

// Removes one design file (a single slide of a version). Designer and Danta only, and not once the feed is approved.
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const session = requireSession(req, params.slug);
  if (!session) return fail('Belum login', 401);
  if (!isLead(session)) return fail('Tidak punya akses', 403);
  const client = db();
  if (!client) return fail('Server belum siap', 500);

  const { data: file } = await client
    .from('ws_files').select('id, feed_id, kind, path, preview_path').eq('id', params.id).maybeSingle();
  if (!file) return fail('File tidak ditemukan', 404);
  if (file.kind !== 'design') return fail('Hanya file desain yang bisa dihapus di sini', 400);

  const { data: feed } = await client
    .from('ws_feeds').select('id, status, project_id').eq('id', file.feed_id).maybeSingle();
  if (!feed || feed.project_id !== session.pid) return fail('File tidak ditemukan', 404);
  if (feed.status === 'approved' || feed.status === 'posted') return fail('Desain yang sudah disetujui tidak bisa dihapus', 409);

  await client.storage.from(BUCKET).remove([file.path, ...(file.preview_path ? [file.preview_path] : [])]);
  const { error } = await client.from('ws_files').delete().eq('id', file.id);
  if (error) return fail(error.message, 500);
  await touch(client, feed.id, session.role, false);
  return NextResponse.json({ ok: true });
}
