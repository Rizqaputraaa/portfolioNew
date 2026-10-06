import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { BUCKET, db, fail, requireSession } from '@/lib/workspace/server';
import { getFeedDetail } from '@/lib/workspace/feeds';

type Ctx = { params: { slug: string; id: string } };

export const runtime = 'nodejs';

// Converts a .docx brief into HTML so it can be read in the browser without downloading.
// The client renders this inside a sandboxed iframe (no scripts), so the HTML is never trusted.
export async function GET(req: NextRequest, { params }: Ctx) {
  const session = requireSession(req, params.slug);
  if (!session) return fail('Belum login', 401);
  const client = db();
  if (!client) return fail('Server belum siap', 500);

  const { data: file } = await client
    .from('ws_files').select('id, feed_id, path, file_name').eq('id', params.id).maybeSingle();
  if (!file) return fail('File tidak ditemukan', 404);
  if (!/\.docx$/i.test(file.file_name)) return fail('Preview teks hanya untuk .docx', 415);

  const { data: feed } = await client
    .from('ws_feeds').select('number, project_id').eq('id', file.feed_id).maybeSingle();
  if (!feed || feed.project_id !== session.pid) return fail('File tidak ditemukan', 404);

  const detail = await getFeedDetail(client, session.pid, feed.number, session.role);
  if (!detail?.files.some(f => f.id === file.id)) return fail('Tidak punya akses ke file ini', 403);

  const { data: blob, error } = await client.storage.from(BUCKET).download(file.path);
  if (error || !blob) return fail(error?.message ?? 'Gagal membuka file', 500);

  const { value } = await mammoth.convertToHtml({ buffer: Buffer.from(await blob.arrayBuffer()) });
  return NextResponse.json({ html: value });
}
