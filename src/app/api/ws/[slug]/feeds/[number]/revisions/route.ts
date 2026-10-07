import { NextRequest, NextResponse } from 'next/server';
import { briefChanged, db, fail, requireSession, touch } from '@/lib/workspace/server';
import { MAX_SLIDES } from '@/lib/workspace/types';

type Ctx = { params: { slug: string; number: string } };

function cleanSlides(input: unknown) {
  return (Array.isArray(input) ? input : []).slice(0, MAX_SLIDES).map((s: Record<string, unknown>, i: number) => ({
    position: i + 1,
    headline: String(s.headline ?? ''),
    body: String(s.body ?? ''),
  }));
}

async function loadFeed(req: NextRequest, ctx: Ctx, roles: ('client' | 'gozi')[]) {
  const session = requireSession(req, ctx.params.slug);
  if (!session) return { error: fail('Belum login', 401) };
  if (!roles.includes(session.role as 'client' | 'gozi')) return { error: fail('Tidak punya akses', 403) };
  const client = db();
  if (!client) return { error: fail('Server belum siap', 500) };
  const { data: feed } = await client
    .from('ws_feeds').select('id, status')
    .eq('project_id', session.pid).eq('number', Number(ctx.params.number)).maybeSingle();
  if (!feed) return { error: fail('Feed tidak ditemukan', 404) };
  return { session, client, feed };
}

// Client sends (or updates) a revision of the brief. Danta's live brief is NOT changed until Danta applies it.
export async function POST(req: NextRequest, ctx: Ctx) {
  const r = await loadFeed(req, ctx, ['client']);
  if ('error' in r) return r.error;
  if (r.feed.status !== 'brief_review') return fail('Revisi hanya bisa dikirim saat brief direview', 409);

  const body = await req.json().catch(() => ({}));
  const title = String(body.title ?? '').trim();
  const slides = cleanSlides(body.slides);
  const note = String(body.note ?? '').trim() || null;
  if (!title) return fail('Judul tidak boleh kosong');

  const { data: pending } = await r.client
    .from('ws_brief_revisions').select('id').eq('feed_id', r.feed.id).eq('status', 'pending').maybeSingle();

  if (pending) {
    const { error } = await r.client.from('ws_brief_revisions')
      .update({ title, slides, note, created_at: new Date().toISOString() }).eq('id', pending.id);
    if (error) return fail(error.message, 500);
  } else {
    const { error } = await r.client.from('ws_brief_revisions').insert({ feed_id: r.feed.id, title, slides, note });
    if (error) return fail(error.message, 500);
  }

  await r.client.from('ws_comments').insert({
    feed_id: r.feed.id, role: 'system', kind: 'system', visibility: 'all',
    body: pending ? 'Client memperbarui revisi brief' : 'Client mengirim revisi brief',
  });
  await touch(r.client, r.feed.id, 'client');
  return NextResponse.json({ ok: true }, { status: 201 });
}

// Danta handles the pending revision: apply it to the brief, or mark it done after editing by hand.
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const r = await loadFeed(req, ctx, ['gozi']);
  if ('error' in r) return r.error;

  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? '');
  if (!['apply', 'dismiss'].includes(action)) return fail('Aksi tidak dikenal');

  const { data: rev } = await r.client
    .from('ws_brief_revisions').select('*').eq('feed_id', r.feed.id).eq('status', 'pending').maybeSingle();
  if (!rev) return fail('Tidak ada revisi yang menunggu', 404);

  if (action === 'apply') {
    const slides = cleanSlides(rev.slides);
    await r.client.from('ws_feeds').update({ title: rev.title }).eq('id', r.feed.id);
    await r.client.from('ws_slides').delete().eq('feed_id', r.feed.id);
    if (slides.length) {
      const { error } = await r.client.from('ws_slides').insert(slides.map(s => ({ feed_id: r.feed.id, ...s })));
      if (error) return fail(error.message, 500);
    }
  }

  // Applying changes the brief; a manual edit already recorded its own change when Danta saved it.
  if (action === 'apply') await briefChanged(r.client, r.feed.id);
  await r.client.from('ws_brief_revisions')
    .update({ status: action === 'apply' ? 'applied' : 'dismissed', resolved_at: new Date().toISOString() })
    .eq('id', rev.id);
  await r.client.from('ws_comments').insert({
    feed_id: r.feed.id, role: 'system', kind: 'system', visibility: 'all',
    body: action === 'apply'
      ? 'Danta menerapkan revisi client ke brief'
      : 'Danta sudah menangani revisi client secara manual',
  });
  await touch(r.client, r.feed.id, 'gozi');
  return NextResponse.json({ ok: true });
}
