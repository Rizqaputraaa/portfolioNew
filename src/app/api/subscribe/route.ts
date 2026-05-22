import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Email tidak valid' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database tidak tersedia' }, { status: 500 });
    }

    // Simpan email ke tabel subscribers
    const { error } = await supabase
      .from('subscribers')
      .insert({ email: email.toLowerCase().trim() });

    // Kalau email sudah terdaftar, anggap sukses saja
    if (error && error.code !== '23505') {
      console.error('Subscribe error:', error);
      return NextResponse.json({ error: 'Gagal mendaftar' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Subscribe handler error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
