import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/workspace/admin';
import { createSessionCookie, setSessionCookie } from '@/lib/workspace/server';

// Opens a client's workspace as the designer, without typing a PIN: the owner is already verified here.
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const slug = String(body.slug ?? '');
  const { data: project } = await admin.client.from('ws_projects').select('id').eq('slug', slug).maybeSingle();
  if (!project) return NextResponse.json({ error: 'Project tidak ditemukan' }, { status: 404 });

  const res = NextResponse.json({ url: `/workspace/${slug}` });
  setSessionCookie(res, slug, createSessionCookie({ pid: project.id, slug, role: 'designer', name: 'Designer' }));
  return res;
}
