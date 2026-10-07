import { NextRequest, NextResponse } from 'next/server';
import { db, fail, hashPin, requireSession, verifyPin } from '@/lib/workspace/server';

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

// A signed-in person changes their own PIN. They must know the current one, and the new PIN has to be
// different from everyone else's in the project (the PIN alone identifies who is logging in).
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const session = requireSession(req, params.slug);
  if (!session) return fail('Belum login', 401);
  const client = db();
  if (!client) return fail('Server belum siap', 500);

  const body = await req.json().catch(() => ({}));
  const current = String(body.current ?? '');
  const next = String(body.next ?? '');

  if (!/^\d{4,8}$/.test(next)) return fail('PIN baru harus 4–8 angka');
  if (next === current) return fail('PIN baru harus berbeda dari PIN saat ini');

  const { data: members } = await client
    .from('ws_members').select('id, role, pin_hash, failed_attempts, locked_until').eq('project_id', session.pid);
  const me = (members ?? []).find(m => m.role === session.role);
  if (!me) return fail('Akun tidak ditemukan', 404);

  if (me.locked_until && new Date(me.locked_until) > new Date()) {
    return fail('Terlalu banyak percobaan. Coba lagi beberapa menit lagi.', 429);
  }

  // Every rejected attempt counts, including "PIN already taken": otherwise this endpoint would let
  // a signed-in person test other roles' PINs one guess at a time.
  const reject = async (message: string) => {
    const attempts = (me.failed_attempts ?? 0) + 1;
    const lock = attempts >= MAX_ATTEMPTS;
    await client.from('ws_members').update({
      failed_attempts: lock ? 0 : attempts,
      locked_until: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null,
    }).eq('id', me.id);
    return fail(message, 400);
  };

  if (!verifyPin(current, me.pin_hash)) return reject('PIN saat ini salah');
  if ((members ?? []).some(m => m.id !== me.id && verifyPin(next, m.pin_hash))) {
    return reject('PIN ini tidak bisa dipakai. Pilih angka lain.');
  }

  const { error } = await client.from('ws_members')
    .update({ pin_hash: hashPin(next), failed_attempts: 0, locked_until: null }).eq('id', me.id);
  if (error) return fail(error.message, 500);

  return NextResponse.json({ ok: true });
}
