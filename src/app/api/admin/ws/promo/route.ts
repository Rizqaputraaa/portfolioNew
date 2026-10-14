import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/workspace/admin';
import { BUCKET } from '@/lib/workspace/server';
import { nameKey } from '@/lib/workspace/raket-image';

const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

// Aset Raket: every racket listed in the feed briefs of all projects that use a promo list.
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return fail('Tidak diizinkan', 401);
  const { client } = admin;

  const { data: projects } = await client
    .from('ws_projects').select('id, slug, name, client_name, instagram')
    .eq('promo_enabled', true).order('created_at', { ascending: true });
  const ids = (projects ?? []).map(p => p.id);
  if (!ids.length) return NextResponse.json({ projects: [] });

  const { data: feeds } = await client
    .from('ws_feeds').select('id, project_id, number, title, status').in('project_id', ids).order('number');
  const feedIds = (feeds ?? []).map(f => f.id);
  const { data: items } = feedIds.length
    ? await client.from('ws_feed_items')
        .select('id, feed_id, position, name, price_original, price_promo, image_url')
        .in('feed_id', feedIds).order('position')
    : { data: [] };

  // The library: one original image per racket name, shown as a thumbnail and downloadable as-is.
  const keys = Array.from(new Set((items ?? []).map(i => nameKey(i.name))));
  const { data: assets } = keys.length
    ? await client.from('ws_racket_assets').select('id, name_key, name, image_path, width, height, size_bytes, mime_type').in('name_key', keys)
    : { data: [] };
  const assetByKey = new Map<string, {
    id: string; width: number | null; height: number | null; size_bytes: number | null; url: string | null; download_url: string | null;
  }>();
  await Promise.all((assets ?? []).map(async a => {
    const ext = (a.image_path.split('.').pop() ?? 'jpg').toLowerCase();
    const file = `${a.name.replace(/[\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim()}.${ext}`;
    const [thumb, dl] = await Promise.all([
      client.storage.from(BUCKET).createSignedUrl(a.image_path, 3600),
      client.storage.from(BUCKET).createSignedUrl(a.image_path, 3600, { download: file }),
    ]);
    assetByKey.set(a.name_key, {
      id: a.id, width: a.width, height: a.height, size_bytes: a.size_bytes,
      url: thumb.data?.signedUrl ?? null, download_url: dl.data?.signedUrl ?? null,
    });
  }));

  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  return NextResponse.json({
    projects: (projects ?? []).map(p => ({
      slug: p.slug,
      name: p.client_name || p.name,
      instagram: p.instagram,
      feeds: (feeds ?? [])
        .filter(f => f.project_id === p.id)
        .map(f => ({
          number: f.number,
          title: f.title,
          status: f.status,
          items: (items ?? []).filter(i => i.feed_id === f.id).map(i => ({
            id: i.id, name: i.name, price_original: num(i.price_original), price_promo: num(i.price_promo), image_url: i.image_url,
            asset: assetByKey.get(nameKey(i.name)) ?? null,
          })),
        }))
        .filter(f => f.items.length > 0),
    })),
  });
}
