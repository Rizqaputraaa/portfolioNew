import { NextRequest, NextResponse } from 'next/server';
import { db, fail, requireSession, touch } from '@/lib/workspace/server';
import { listFeeds } from '@/lib/workspace/feeds';
import { MAX_SLIDES } from '@/lib/workspace/types';

// Project info + the signed-in member + every feed (filtered for their role).
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const session = requireSession(req, params.slug);
  if (!session) return fail('Belum login', 401);
  const client = db();
  if (!client) return fail('Server belum siap', 500);

  const { data: project } = await client
    .from('ws_projects').select('slug, name, month_label, target_feeds').eq('id', session.pid).maybeSingle();
  if (!project) return fail('Workspace tidak ditemukan', 404);

  const feeds = await listFeeds(client, session.pid, session.role);
  return NextResponse.json({ project, me: { role: session.role, name: session.name }, feeds });
}

// New feed brief — Danta writes briefs; the client may also submit one (raw brief from their side).
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const session = requireSession(req, params.slug);
  if (!session) return fail('Belum login', 401);
  if (session.role === 'designer') return fail('Brief dibuat oleh Danta atau client', 403);
  const client = db();
  if (!client) return fail('Server belum siap', 500);

  const body = await req.json().catch(() => ({}));
  let title = String(body.title ?? '').trim();

  const { data: project } = await client
    .from('ws_projects').select('target_feeds').eq('id', session.pid).maybeSingle();
  if (!project) return fail('Workspace tidak ditemukan', 404);

  const { data: last } = await client
    .from('ws_feeds').select('number').eq('project_id', session.pid)
    .order('number', { ascending: false }).limit(1).maybeSingle();
  const number = (last?.number ?? 0) + 1;
  if (number > project.target_feeds) return fail(`Target ${project.target_feeds} feed sudah penuh`);

  if (!title) title = `Feed ${number}`;

  const { data: feed, error } = await client
    .from('ws_feeds')
    .insert({ project_id: session.pid, number, title, created_by: session.role })
    .select('id, number').single();
  if (error || !feed) return fail(error?.message ?? 'Gagal membuat feed', 500);

  // Optional first-draft slides (max 3)
  const slides = (Array.isArray(body.slides) ? body.slides : []).slice(0, MAX_SLIDES);
  if (slides.length) {
    await client.from('ws_slides').insert(
      slides.map((s: Record<string, unknown>, i: number) => ({
        feed_id: feed.id,
        position: i + 1,
        headline: String(s.headline ?? ''),
        body: String(s.body ?? ''),
      })),
    );
  }

  await client.from('ws_comments').insert({
    feed_id: feed.id, role: 'system', kind: 'system', visibility: 'all',
    body: session.role === 'client' ? 'Client membuat feed baru' : 'Brief dibuat oleh Danta',
  });

  await touch(client, feed.id, session.role, session.role === 'client');
  return NextResponse.json({ number: feed.number }, { status: 201 });
}
