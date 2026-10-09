import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/workspace/admin';
import { BUCKET } from '@/lib/workspace/server';

const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });
const MAX_AVATAR_BYTES = 400 * 1024; // the browser sends a ~320px square, far below this

// Edit a client: name, Instagram, photo and the pack details. The address (slug) never changes,
// so links that were already shared keep working.
export async function PATCH(req: NextRequest, { params }: { params: { slug: string } }) {
  const admin = await requireAdmin(req);
  if (!admin) return fail('Tidak diizinkan', 401);
  const { client } = admin;

  const { data: project } = await client
    .from('ws_projects').select('id, avatar_path').eq('slug', params.slug).maybeSingle();
  if (!project) return fail('Client tidak ditemukan', 404);

  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};

  if ('clientName' in body) {
    const name = String(body.clientName ?? '').trim().slice(0, 80);
    if (!name) return fail('Nama client wajib diisi');
    patch.client_name = name;
    patch.name = name; // the workspace heading follows the client's name
  }

  if ('instagram' in body) {
    const ig = String(body.instagram ?? '').trim().replace(/^@+/, '').slice(0, 60);
    if (ig && !/^[A-Za-z0-9._]+$/.test(ig)) return fail('Username Instagram hanya boleh huruf, angka, titik, dan garis bawah');
    patch.instagram = ig || null;
  }

  if ('feeds' in body) {
    const feeds = Number(body.feeds);
    if (!Number.isInteger(feeds) || feeds < 1 || feeds > 60) return fail('Jumlah feed harus 1–60');
    const { data: last } = await client
      .from('ws_feeds').select('number').eq('project_id', project.id).order('number', { ascending: false }).limit(1).maybeSingle();
    if (last && feeds < last.number) return fail(`Sudah ada feed nomor ${last.number}. Jumlah feed tidak boleh lebih kecil dari itu.`);
    patch.target_feeds = feeds;
  }

  if ('packNumber' in body) patch.pack_number = Math.max(1, Math.floor(Number(body.packNumber)) || 1);
  if ('monthLabel' in body) patch.month_label = String(body.monthLabel ?? '').trim().slice(0, 40) || null;

  if ('price' in body) {
    if (body.price === '' || body.price == null) patch.price = null;
    else {
      const price = Number(body.price);
      if (!Number.isFinite(price) || price < 0) return fail('Harga tidak valid');
      patch.price = price;
    }
  }

  if ('avatar' in body) {
    const oldPath = project.avatar_path as string | null;
    if (body.avatar === null) {
      patch.avatar_path = null;
    } else {
      const m = /^data:(image\/(?:webp|png|jpeg));base64,([A-Za-z0-9+/=]+)$/.exec(String(body.avatar));
      if (!m) return fail('Format foto tidak dikenal');
      const bytes = Buffer.from(m[2], 'base64');
      if (bytes.length > MAX_AVATAR_BYTES) return fail('Foto terlalu besar');
      const ext = m[1] === 'image/png' ? 'png' : m[1] === 'image/jpeg' ? 'jpg' : 'webp';
      const path = `avatars/${project.id}-${Date.now()}.${ext}`; // new name every time, so no stale cache
      const { error } = await client.storage.from(BUCKET).upload(path, bytes, { contentType: m[1], upsert: true });
      if (error) return fail(error.message, 500);
      patch.avatar_path = path;
    }
    if (oldPath) await client.storage.from(BUCKET).remove([oldPath]);
  }

  if (Object.keys(patch).length === 0) return fail('Tidak ada yang diubah');
  const { error } = await client.from('ws_projects').update(patch).eq('id', project.id);
  if (error) return fail(error.message, 500);
  return NextResponse.json({ ok: true });
}
