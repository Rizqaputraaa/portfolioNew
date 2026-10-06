import { NextRequest, NextResponse } from 'next/server';
import { briefChanged, db, fail, requireSession, touch } from '@/lib/workspace/server';

type Ctx = { params: { slug: string; number: string } };

const MAX_LINKS = 20;

async function loadFeed(req: NextRequest, ctx: Ctx) {
  const session = requireSession(req, ctx.params.slug);
  if (!session) return { error: fail('Belum login', 401) };
  if (session.role === 'designer') return { error: fail('Link referensi ditambahkan oleh Danta atau client', 403) };
  const client = db();
  if (!client) return { error: fail('Server belum siap', 500) };

  const { data: feed } = await client
    .from('ws_feeds').select('id, status, created_by')
    .eq('project_id', session.pid).eq('number', Number(ctx.params.number)).maybeSingle();
  if (!feed) return { error: fail('Feed tidak ditemukan', 404) };
  if (session.role === 'client' && (feed.status === 'posted' || (feed.status === 'brief' && feed.created_by === 'gozi'))) {
    return { error: fail('Feed ini belum bisa menerima link dari client', 403) };
  }
  return { session, client, feed };
}

// Add a reference link (Drive, Instagram, …) with a free-form label.
export async function POST(req: NextRequest, ctx: Ctx) {
  const r = await loadFeed(req, ctx);
  if ('error' in r) return r.error;

  const body = await req.json().catch(() => ({}));
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
    .from('ws_links').select('id', { count: 'exact', head: true }).eq('feed_id', r.feed.id);
  if ((count ?? 0) >= MAX_LINKS) return fail(`Maksimal ${MAX_LINKS} link per feed`);

  const { error } = await r.client.from('ws_links').insert({
    feed_id: r.feed.id,
    label: label || new URL(url).hostname.replace(/^www\./, ''),
    url,
    added_by: r.session.role,
  });
  if (error) return fail(error.message, 500);
  const isDraft = r.feed.status === 'brief' && r.feed.created_by === 'gozi';
  await briefChanged(r.client, r.feed.id);
  await touch(r.client, r.feed.id, r.session.role, !isDraft);
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const r = await loadFeed(req, ctx);
  if ('error' in r) return r.error;
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return fail('id wajib diisi');

  // Danta can remove any link; the client only their own.
  let q = r.client.from('ws_links').delete().eq('id', id).eq('feed_id', r.feed.id);
  if (r.session.role === 'client') q = q.eq('added_by', 'client');
  const { error } = await q;
  if (error) return fail(error.message, 500);
  await briefChanged(r.client, r.feed.id);
  return NextResponse.json({ ok: true });
}
