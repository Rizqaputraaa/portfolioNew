import { NextRequest, NextResponse } from 'next/server';
import { briefChanged, db, fail, markSeen, requireSession, touch } from '@/lib/workspace/server';
import { getFeedDetail } from '@/lib/workspace/feeds';
import { MAX_SLIDES } from '@/lib/workspace/types';

type Ctx = { params: { slug: string; number: string } };

export async function GET(req: NextRequest, { params }: Ctx) {
  const session = requireSession(req, params.slug);
  if (!session) return fail('Belum login', 401);
  const client = db();
  if (!client) return fail('Server belum siap', 500);

  const detail = await getFeedDetail(client, session.pid, Number(params.number), session.role);
  if (!detail) return fail('Feed tidak ditemukan', 404);
  if (!detail.draft_hidden) await markSeen(client, detail.id, session.role);
  return NextResponse.json(detail);
}

// Edit brief: title, caption, post date, slides (max 3).
// Danta may always edit. The client may edit a feed they created while it is still in "brief".
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = requireSession(req, params.slug);
  if (!session) return fail('Belum login', 401);
  if (session.role === 'designer') return fail('Tidak punya akses mengubah brief', 403);
  const client = db();
  if (!client) return fail('Server belum siap', 500);

  const { data: feed } = await client
    .from('ws_feeds').select('id, status, created_by')
    .eq('project_id', session.pid).eq('number', Number(params.number)).maybeSingle();
  if (!feed) return fail('Feed tidak ditemukan', 404);

  // The client edits directly only a brief they started themselves. Changes to Danta's brief go
  // through /revisions so Danta can see exactly what changed before applying it.
  const clientCanEdit = feed.created_by === 'client' && feed.status === 'brief';
  if (session.role === 'client' && !clientCanEdit) {
    return fail('Kirim perubahan sebagai revisi ke Danta', 403);
  }

  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.title === 'string') {
    if (!body.title.trim()) return fail('Judul tidak boleh kosong');
    patch.title = body.title.trim();
  }
  if (typeof body.caption === 'string') patch.caption = body.caption;
  if (session.role === 'gozi' && 'post_date' in body) patch.post_date = body.post_date || null;

  const { error } = await client.from('ws_feeds').update(patch).eq('id', feed.id);
  if (error) return fail(error.message, 500);

  if (Array.isArray(body.slides)) {
    const slides = body.slides.slice(0, MAX_SLIDES);
    await client.from('ws_slides').delete().eq('feed_id', feed.id);
    if (slides.length) {
      const { error: slideErr } = await client.from('ws_slides').insert(
        slides.map((s: Record<string, unknown>, i: number) => ({
          feed_id: feed.id,
          position: i + 1,
          headline: String(s.headline ?? ''),
          body: String(s.body ?? ''),
          highlight: String(s.highlight ?? ''),
        })),
      );
      if (slideErr) return fail(slideErr.message, 500);
    }
  }

  await briefChanged(client, feed.id);
  // Editing Danta's own draft is private; once it is out for review, the client should hear about it.
  await touch(client, feed.id, session.role, !(feed.status === 'brief' && feed.created_by === 'gozi'));
  return NextResponse.json({ ok: true });
}
