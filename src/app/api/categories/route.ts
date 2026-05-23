import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// GET semua kategori — pakai admin client agar bypass RLS
export async function GET() {
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json([]);

  const { data, error } = await db
    .from('project_categories')
    .select('*')
    .order('label', { ascending: true });

  if (error) return NextResponse.json([]);
  return NextResponse.json(data ?? []);
}

// POST tambah kategori baru
export async function POST(req: NextRequest) {
  const { label, value } = await req.json();
  if (!label || !value) return NextResponse.json({ error: 'Label dan value wajib diisi' }, { status: 400 });

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: 'DB error' }, { status: 500 });

  const { data, error } = await db
    .from('project_categories')
    .insert({ label: label.trim(), value: value.trim().toLowerCase().replace(/\s+/g, '_') })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

// DELETE hapus kategori
export async function DELETE(req: NextRequest) {
  const { value } = await req.json();
  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: 'DB error' }, { status: 500 });

  await db.from('project_categories').delete().eq('value', value);
  return NextResponse.json({ success: true });
}
