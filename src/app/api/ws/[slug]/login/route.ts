import { NextRequest, NextResponse } from 'next/server';
import { checkLogin, createSessionCookie, fail, setSessionCookie } from '@/lib/workspace/server';
import type { Role } from '@/lib/workspace/types';

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const body = await req.json().catch(() => ({}));
  const pin = String(body.pin ?? '');

  if (!/^\d{4,8}$/.test(pin)) return fail('PIN harus 4–8 angka');

  const result = await checkLogin(params.slug, pin);
  if ('error' in result) return fail(result.error as string, result.status);
  const role = result.member.role as Role;

  const res = NextResponse.json({ ok: true, role, name: result.member.name });
  setSessionCookie(
    res,
    params.slug,
    createSessionCookie({ pid: result.project.id, slug: params.slug, role, name: result.member.name }),
  );
  return res;
}

export async function DELETE(_req: NextRequest, { params }: { params: { slug: string } }) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(`ws_${params.slug}`, '', { path: '/', maxAge: 0 });
  return res;
}
