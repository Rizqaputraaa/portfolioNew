import { NextRequest, NextResponse } from 'next/server';
import { briefChanged, db, fail, requireSession, touch } from '@/lib/workspace/server';
import type { Role } from '@/lib/workspace/types';

type Ctx = { params: { slug: string; number: string } };
type Kind = 'reference' | 'result';

const MAX_LINKS = 20;

/**
 * Two kinds of links share one table:
 *  - reference: material for the brief (Drive, Instagram …) — Danta and the client add them
 *  - result:    where the finished files can be copied from  — the designer and Danta add them
 */
const canManage = (kind: Kind, role: Role) =>
  kind === 'result' ? role === 'designer' || role === 'gozi' : role === 'gozi' || role === 'client';

async function loadFeed(req: NextRequest, ctx: Ctx) {
  const session = requireSession(req, ctx.params.slug);
  if (!session) return { error: fail('Belum login', 401) };
  const client = db();
  if (!client) return { error: fail('Server belum siap', 500) };

  const { data: feed } = await client
    .from('ws_feeds').select('id, status, created_by')
    .eq('project_id', session.pid).eq('number', Number(ctx.params.number)).maybeSingle();
  if (!feed) return { error: fail('Feed tidak ditemukan', 404) };
  return { session, client, feed };
}

// Add a link with a free-form label.
export async function POST(req: NextRequest, ctx: Ctx) {
  const r = await loadFeed(req, ctx);
  if ('error' in r) return r.error;

  const body = await req.json().catch(() => ({}));
  const kind: Kind = body.kind === 'result' ? 'result' : 'reference';
  const role = r.session.role as Role;

  if (!canManage(kind, role)) {
    return fail(kind === 'result' ? 'Link hasil ditambahkan oleh designer atau Danta' : 'Link referensi ditambahkan oleh Danta atau client', 403);
  }
  const isDraft = r.feed.status === 'brief' && r.feed.created_by === 'gozi';
  if (kind === 'reference' && role === 'client' && (r.feed.status === 'posted' || isDraft)) {
    return fail('Feed ini belum bisa menerima link dari client', 403);
  }
  if (kind === 'result' && ['brief', 'brief_review'].includes(r.feed.status)) {
    return fail('Link hasil bisa ditambahkan setelah brief dikirim ke designer', 409);
  }

  const label = String(body.label ?? '').trim().slice(0, 80);
  let url = String(body.url ?? '').trim();
  if (!url) return fail('Link wajib diisi');
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`; // "drive.google.com/…" → https://…

  try {
    const u = new URL(url);
    if (!['http:', 'https:'].includes(u.protocol) || !u.hostname.includes('.')) throw new Error();
    url = u.toString();
  } catch {
    return fail('Link tidak valid');
  }

  const { count } = await r.client
    .from('ws_links').select('id', { count: 'exact', head: true }).eq('feed_id', r.feed.id).eq('kind', kind);
  if ((count ?? 0) >= MAX_LINKS) return fail(`Maksimal ${MAX_LINKS} link per feed`);

  const { error } = await r.client.from('ws_links').insert({
    feed_id: r.feed.id,
    kind,
    label: label || new URL(url).hostname.replace(/^www\./, ''),
    url,
    added_by: role,
  });
  if (error) return fail(error.message, 500);

  if (kind === 'reference') {
    await briefChanged(r.client, r.feed.id);
    await touch(r.client, r.feed.id, role, !isDraft);
  } else {
    // The client only gets to see result links once the design is approved.
    await touch(r.client, r.feed.id, role, ['approved', 'posted'].includes(r.feed.status));
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const r = await loadFeed(req, ctx);
  if ('error' in r) return r.error;
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return fail('id wajib diisi');

  const { data: link } = await r.client
    .from('ws_links').select('id, kind, added_by').eq('id', id).eq('feed_id', r.feed.id).maybeSingle();
  if (!link) return fail('Link tidak ditemukan', 404);

  const role = r.session.role as Role;
  if (!canManage(link.kind as Kind, role)) return fail('Tidak punya akses menghapus link ini', 403);
  // Danta can remove any reference link; the client only their own.
  if (link.kind === 'reference' && role === 'client' && link.added_by !== 'client') {
    return fail('Tidak punya akses menghapus link ini', 403);
  }

  const { error } = await r.client.from('ws_links').delete().eq('id', id);
  if (error) return fail(error.message, 500);
  if (link.kind === 'reference') await briefChanged(r.client, r.feed.id);
  return NextResponse.json({ ok: true });
}
