import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { MAX_PRICE, MAX_PROMO_ITEMS, MIN_PRICE, cleanUrl } from '@/lib/workspace/promo';

const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });
const MAX_BATCHES_PER_HOUR = 20;

async function findProject(token: string) {
  const client = getSupabaseAdmin();
  if (!client || !/^[a-z0-9]{8,40}$/i.test(token)) return { client: null, project: null };
  const { data } = await client
    .from('ws_projects').select('id, name, client_name, instagram').eq('form_token', token).maybeSingle();
  return { client, project: data };
}

// The form page asks who it is for.
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const { project } = await findProject(params.token);
  if (!project) return fail('Link form tidak valid', 404);
  return NextResponse.json({ name: project.client_name || project.name, instagram: project.instagram });
}

// A client submits a promo list. No login: the secret token in the link is the key, and everything is
// validated here, so a hand-made request cannot store anything the form would not have allowed.
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const { client, project } = await findProject(params.token);
  if (!client || !project) return fail('Link form tidak valid', 404);

  const body = await req.json().catch(() => ({}));
  const title = String(body.title ?? '').trim().slice(0, 80);
  if (!title) return fail('Nama promo wajib diisi');

  const raw = Array.isArray(body.items) ? body.items : [];
  if (raw.length === 0) return fail('Isi minimal satu raket');
  if (raw.length > MAX_PROMO_ITEMS) return fail(`Maksimal ${MAX_PROMO_ITEMS} raket per kiriman`);

  const items: { position: number; name: string; price_original: number | null; price_promo: number; image_url: string | null }[] = [];
  for (let i = 0; i < raw.length; i++) {
    const r = raw[i] as Record<string, unknown>;
    const name = String(r.name ?? '').trim().slice(0, 140);
    const promo = Number(r.pricePromo);
    const original = r.priceOriginal == null || r.priceOriginal === '' ? null : Number(r.priceOriginal);
    if (!name) return fail(`Baris ${i + 1}: nama raket kosong`);
    if (!Number.isFinite(promo) || promo < MIN_PRICE || promo > MAX_PRICE) return fail(`Baris ${i + 1}: harga promo tidak valid`);
    if (original !== null && (!Number.isFinite(original) || original < MIN_PRICE || original > MAX_PRICE)) {
      return fail(`Baris ${i + 1}: harga awal tidak valid`);
    }
    const imageRaw = String(r.imageUrl ?? '').trim();
    const image = cleanUrl(imageRaw);
    if (imageRaw && !image) return fail(`Baris ${i + 1}: link gambar tidak valid`);
    items.push({ position: i + 1, name, price_original: original, price_promo: Math.round(promo), image_url: image });
  }

  // A leaked link must not become a flood.
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await client
    .from('ws_promo_batches').select('id', { count: 'exact', head: true }).eq('project_id', project.id).gte('created_at', since);
  if ((count ?? 0) >= MAX_BATCHES_PER_HOUR) return fail('Terlalu banyak kiriman. Coba lagi nanti.', 429);

  const { data: batch, error } = await client
    .from('ws_promo_batches').insert({ project_id: project.id, title }).select('id').single();
  if (error || !batch) return fail(error?.message ?? 'Gagal menyimpan', 500);

  const { error: itemsError } = await client.from('ws_promo_items').insert(items.map(it => ({ batch_id: batch.id, ...it })));
  if (itemsError) {
    await client.from('ws_promo_batches').delete().eq('id', batch.id); // nothing half-saved
    return fail(itemsError.message, 500);
  }

  return NextResponse.json({ ok: true, count: items.length }, { status: 201 });
}
