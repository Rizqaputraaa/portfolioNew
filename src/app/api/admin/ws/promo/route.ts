import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/workspace/admin';

const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

// The owner's view of what a client submitted through the form.
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return fail('Tidak diizinkan', 401);
  const { client } = admin;

  const slug = req.nextUrl.searchParams.get('slug') ?? '';
  const { data: project } = await client
    .from('ws_projects').select('id, name, client_name, form_token').eq('slug', slug).maybeSingle();
  if (!project) return fail('Project tidak ditemukan', 404);

  const { data: batches } = await client
    .from('ws_promo_batches').select('id, title, status, created_at')
    .eq('project_id', project.id).order('created_at', { ascending: false }).limit(50);

  const ids = (batches ?? []).map(b => b.id);
  const { data: items } = ids.length
    ? await client.from('ws_promo_items')
        .select('id, batch_id, position, name, price_original, price_promo, image_url')
        .in('batch_id', ids).order('position')
    : { data: [] };

  return NextResponse.json({
    project: { name: project.client_name || project.name, formToken: project.form_token },
    batches: (batches ?? []).map(b => ({ ...b, items: (items ?? []).filter(i => i.batch_id === b.id) })),
  });
}

// Mark a batch as handled (or new again).
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return fail('Tidak diizinkan', 401);
  const body = await req.json().catch(() => ({}));
  if (!['new', 'processed'].includes(body.status)) return fail('Status tidak valid');
  const { error } = await admin.client.from('ws_promo_batches').update({ status: body.status }).eq('id', String(body.id ?? ''));
  if (error) return fail(error.message, 500);
  return NextResponse.json({ ok: true });
}

// Remove a batch (a test submission, or one that was sent twice).
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return fail('Tidak diizinkan', 401);
  const id = req.nextUrl.searchParams.get('id') ?? '';
  const { error } = await admin.client.from('ws_promo_batches').delete().eq('id', id);
  if (error) return fail(error.message, 500);
  return NextResponse.json({ ok: true });
}
