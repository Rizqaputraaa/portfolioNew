import { NextRequest, NextResponse } from 'next/server';
import { fail, isLead, requireSession } from '@/lib/workspace/server';
import { ListFileError, readPromoFile } from '@/lib/workspace/promo-file';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Reads an uploaded racket list and hands the rows back for the person to check. Nothing is stored here:
// the rows only become part of the brief when someone saves it.
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const session = requireSession(req, params.slug);
  if (!session) return fail('Belum login', 401);
  if (!isLead(session) && session.role !== 'client') return fail('Tidak punya akses', 403);

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return fail('Pilih file dulu');

  try {
    return NextResponse.json(await readPromoFile(file));
  } catch (e) {
    if (e instanceof ListFileError) return fail(e.message);
    return fail('File tidak bisa dibaca', 500);
  }
}
