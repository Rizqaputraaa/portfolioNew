import { NextRequest, NextResponse } from 'next/server';
import { TRANSITIONS, db, fail, requireSession, touch } from '@/lib/workspace/server';
import { lastSentVersion } from '@/lib/workspace/feeds';
import { STATUS_LABEL } from '@/lib/workspace/types';
import type { FeedStatus } from '@/lib/workspace/types';

type Ctx = { params: { slug: string; number: string } };

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = requireSession(req, params.slug);
  if (!session) return fail('Belum login', 401);
  const client = db();
  if (!client) return fail('Server belum siap', 500);

  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? '');
  const note = String(body.note ?? '').trim();

  const { data: feed } = await client
    .from('ws_feeds').select('id, status, created_by, brief_changed_at, brief_confirmed_at')
    .eq('project_id', session.pid).eq('number', Number(params.number)).maybeSingle();
  if (!feed) return fail('Feed tidak ditemukan', 404);

  /* ── Plain comment ─────────────────────────────────────────────── */
  if (action === 'comment') {
    if (!note) return fail('Komentar kosong');
    // Client comments are always visible to everyone; Danta picks; designer stays internal.
    const visibility =
      session.role === 'client' ? 'all'
      : session.role === 'gozi' && body.visibility === 'all' ? 'all'
      : 'internal';
    await client.from('ws_comments').insert({
      feed_id: feed.id, role: session.role, kind: 'comment', visibility, body: note,
    });
    // Internal notes must not light up the client's badge.
    await touch(client, feed.id, session.role, visibility === 'all');
    return NextResponse.json({ ok: true });
  }

  /* ── Client confirms the brief (no status change) ──────────────── */
  if (action === 'approve_brief') {
    if (session.role !== 'client') return fail('Hanya client yang bisa mengonfirmasi brief', 403);
    if (feed.status !== 'brief_review') return fail('Brief belum dikirim untuk direview', 409);
    const alreadyConfirmed = feed.brief_confirmed_at
      && (!feed.brief_changed_at || new Date(feed.brief_changed_at) <= new Date(feed.brief_confirmed_at));
    if (alreadyConfirmed) return fail('Brief ini sudah kamu konfirmasi. Tunggu ada perubahan baru.', 409);
    const { count: waiting } = await client
      .from('ws_brief_revisions').select('id', { count: 'exact', head: true })
      .eq('feed_id', feed.id).eq('status', 'pending');
    if (waiting) return fail('Revisimu masih menunggu Danta', 409);
    await client.from('ws_feeds').update({ brief_confirmed_at: new Date().toISOString() }).eq('id', feed.id);
    await client.from('ws_comments').insert({
      feed_id: feed.id, role: 'client', kind: 'approval', visibility: 'all',
      body: note || 'Brief sudah sesuai',
    });
    await touch(client, feed.id, 'client');
    return NextResponse.json({ ok: true, status: feed.status });
  }

  /* ── Status transition ─────────────────────────────────────────── */
  const rule = TRANSITIONS[action];
  if (!rule) return fail('Aksi tidak dikenal');
  if (!rule.roles.includes(session.role)) return fail('Role kamu tidak bisa melakukan aksi ini', 403);
  if (!rule.from.includes(feed.status as FeedStatus)) {
    return fail(`Aksi ini tidak bisa dari status "${STATUS_LABEL[feed.status as FeedStatus]}"`, 409);
  }

  const { data: comments } = await client
    .from('ws_comments').select('kind, role, version').eq('feed_id', feed.id);
  const sent = lastSentVersion((comments ?? []) as { kind: 'system'; role: 'system'; version: number | null }[]);

  let commentRow: Record<string, unknown> | null = null;

  if (action === 'send_brief_to_client' || action === 'send_to_designer') {
    // A brief with no content has nothing to review or design from.
    const [{ data: slides }, { count: files }, { count: links }] = await Promise.all([
      client.from('ws_slides').select('headline, body').eq('feed_id', feed.id),
      client.from('ws_files').select('id', { count: 'exact', head: true }).eq('feed_id', feed.id).eq('kind', 'brief'),
      client.from('ws_links').select('id', { count: 'exact', head: true }).eq('feed_id', feed.id),
    ]);
    if (action === 'send_to_designer') {
      const { count: pending } = await client
        .from('ws_brief_revisions').select('id', { count: 'exact', head: true })
        .eq('feed_id', feed.id).eq('status', 'pending');
      if (pending) return fail('Ada revisi dari client yang belum ditangani. Terapkan atau tandai selesai dulu.', 409);
    }
    const hasText = (slides ?? []).some(sl => sl.headline?.trim() || sl.body?.trim());
    if (!hasText && !files && !links) return fail('Isi brief dulu (slide, file, atau link) sebelum dikirim');
  }

  if (action === 'send_brief_to_client') {
    commentRow = { role: 'system', kind: 'system', visibility: 'all', body: 'Brief dikirim ke client untuk direview' };
  } else if (action === 'send_to_designer') {
    commentRow = { role: 'system', kind: 'system', visibility: 'internal', body: 'Brief dikirim ke designer' };
  } else if (action === 'send_to_review') {
    const openVersion = sent + 1;
    const { count } = await client
      .from('ws_files').select('id', { count: 'exact', head: true })
      .eq('feed_id', feed.id).eq('kind', 'design').eq('version', openVersion);
    if (!count) return fail('Upload minimal 1 file desain sebelum dikirim ke review');
    commentRow = {
      role: 'system', kind: 'system', visibility: 'internal',
      body: `Versi ${openVersion} dikirim ke review`, version: openVersion,
    };
  } else if (action === 'request_revision') {
    if (!note) return fail('Tulis catatan revisi');
    commentRow = {
      role: 'gozi', kind: 'revision', visibility: 'internal', body: note, version: sent,
    };
  } else if (action === 'approve') {
    commentRow = {
      role: 'gozi', kind: 'approval', visibility: 'all',
      body: note || `Versi ${sent} disetujui`, version: sent,
    };
  } else if (action === 'mark_posted') {
    commentRow = {
      role: 'system', kind: 'system', visibility: 'all',
      body: `Ditandai sudah diposting oleh ${session.role === 'client' ? 'client' : 'Danta'}`,
    };
  }

  const { error } = await client
    .from('ws_feeds').update(action === 'send_brief_to_client' ? { status: rule.to, brief_confirmed_at: null } : { status: rule.to })
    .eq('id', feed.id);
  if (error) return fail(error.message, 500);

  if (commentRow) await client.from('ws_comments').insert({ feed_id: feed.id, ...commentRow });
  // Only these steps are something the client should be told about.
  const publicSteps = ['send_brief_to_client', 'approve', 'mark_posted'];
  await touch(client, feed.id, session.role, publicSteps.includes(action));
  return NextResponse.json({ ok: true, status: rule.to });
}
