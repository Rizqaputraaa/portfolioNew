import { randomInt } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/workspace/admin';
import { hashPin } from '@/lib/workspace/server';

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

const newPin = () => String(randomInt(0, 1_000_000)).padStart(6, '0');
const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

// "+ Client": creates a project and its PINs. The PINs are returned once; only hashes are stored.
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return fail('Tidak diizinkan', 401);
  const { client } = admin;

  const body = await req.json().catch(() => ({}));
  const clientName = String(body.clientName ?? '').trim().slice(0, 80);
  const instagram = String(body.instagram ?? '').trim().replace(/^@+/, '').slice(0, 60);
  const monthLabel = String(body.monthLabel ?? '').trim().slice(0, 40) || null;
  const feeds = Number(body.feeds);
  const packNumber = Math.max(1, Number(body.packNumber) || 1);
  const price = body.price === '' || body.price == null ? null : Number(body.price);
  const clientLogin = body.clientLogin === true;

  if (!clientName) return fail('Nama client wajib diisi');
  if (!Number.isInteger(feeds) || feeds < 1 || feeds > 60) return fail('Jumlah feed harus 1–60');
  if (price !== null && (!Number.isFinite(price) || price < 0)) return fail('Harga tidak valid');
  // Projects without Danta need the owner to hold both roles; that is not built yet.
  if (body.danta === false) return fail('Project tanpa Danta belum tersedia', 409);

  // Unique, readable address: /w/<slug>
  const base = slugify(instagram || clientName) || 'client';
  let slug = base;
  for (let i = 2; ; i++) {
    const { data } = await client.from('ws_projects').select('id').eq('slug', slug).maybeSingle();
    if (!data) break;
    slug = `${base}-${i}`;
  }

  const { data: project, error } = await client.from('ws_projects').insert({
    slug,
    name: clientName,
    client_name: clientName,
    instagram: instagram || null,
    month_label: monthLabel,
    target_feeds: feeds,
    pack_number: packNumber,
    price,
    danta_enabled: true,
    client_enabled: clientLogin,
  }).select('id').single();
  if (error || !project) return fail(error?.message ?? 'Gagal membuat project', 500);

  const members = [
    { role: 'designer', name: 'Designer', label: 'Designer (kamu)' },
    { role: 'gozi', name: 'Danta', label: 'Danta' },
    ...(clientLogin ? [{ role: 'client', name: 'Client', label: 'Client' }] : []),
  ];

  const used = new Set<string>();
  const pins: { role: string; label: string; pin: string }[] = [];
  for (const m of members) {
    let pin = newPin();
    while (used.has(pin)) pin = newPin(); // login is PIN-only, so PINs must be unique within the project
    used.add(pin);
    const { error: e } = await client.from('ws_members')
      .insert({ project_id: project.id, role: m.role, name: m.name, pin_hash: hashPin(pin) });
    if (e) {
      await client.from('ws_projects').delete().eq('id', project.id); // roll back, nothing half-created
      return fail(e.message, 500);
    }
    pins.push({ role: m.role, label: m.label, pin });
  }

  return NextResponse.json({ slug, name: clientName, pins }, { status: 201 });
}
