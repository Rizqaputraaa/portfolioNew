import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/workspace/admin';
import { BUCKET } from '@/lib/workspace/server';

// Everything the owner dashboard shows: the client cards, the summary cards and the open todos.
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });
  const { client } = admin;

  const [{ data: projects }, { data: feeds }, { data: todos }, { count: openTodos }] = await Promise.all([
    client.from('ws_projects')
      .select('id, slug, name, client_name, instagram, pack_number, target_feeds, month_label, price, avatar_path, danta_enabled, client_enabled, created_at')
      .order('created_at', { ascending: true }),
    client.from('ws_feeds').select('project_id, status'),
    client.from('todos').select('id, text, priority').eq('done', false).order('created_at', { ascending: false }).limit(3),
    client.from('todos').select('id', { count: 'exact', head: true }).eq('done', false),
  ]);

  const byProject = new Map<string, Record<string, number>>();
  for (const f of feeds ?? []) {
    const counts = byProject.get(f.project_id) ?? {};
    counts[f.status] = (counts[f.status] ?? 0) + 1;
    byProject.set(f.project_id, counts);
  }

  // Photos live in the private bucket, so each gets a one-hour link.
  const paths = (projects ?? []).map(p => p.avatar_path).filter((x): x is string => !!x);
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data } = await client.storage.from(BUCKET).createSignedUrls(paths, 3600);
    for (const s of data ?? []) if (s.path && s.signedUrl) signed.set(s.path, s.signedUrl);
  }

  const list = (projects ?? []).map(({ avatar_path, ...p }) => {
    const counts = byProject.get(p.id) ?? {};
    const done = (counts.approved ?? 0) + (counts.posted ?? 0);
    return { ...p, counts, done, avatar_url: avatar_path ? signed.get(avatar_path) ?? null : null };
  });

  const sum = (keys: string[]) =>
    list.reduce((n, p) => n + keys.reduce((m, k) => m + (p.counts[k] ?? 0), 0), 0);

  return NextResponse.json({
    projects: list,
    summary: {
      needsWork: sum(['design', 'revision']),          // the designer has to act
      needsReview: sum(['review']),                    // waiting for Danta to approve
      done: list.reduce((n, p) => n + p.done, 0),
      target: list.reduce((n, p) => n + p.target_feeds, 0),
      projects: list.length,
    },
    todos: { open: openTodos ?? 0, top: todos ?? [] },
  });
}
