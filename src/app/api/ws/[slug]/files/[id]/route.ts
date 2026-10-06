import { NextRequest, NextResponse } from 'next/server';
import { BUCKET, db, fail, requireSession } from '@/lib/workspace/server';
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
  const detail = await getFeedDetail(client, session.pid, feed.number, session.role);
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
