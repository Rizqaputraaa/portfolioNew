import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { sourceTitle, sourceSlug, sourceDescription, sourceThumbnail } = await req.json();

    const supabase = getSupabaseAdmin();
    if (!supabase) return NextResponse.json({ error: 'DB error' }, { status: 500 });

    // Ambil semua email subscriber
    const { data: subscribers, error } = await supabase
      .from('subscribers')
      .select('email');

    if (error || !subscribers?.length) {
      return NextResponse.json({ message: 'Tidak ada subscriber' });
    }

    const emails = subscribers.map(s => s.email);
    const sourceUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://portfolio-new-26.vercel.app'}/source/${sourceSlug}`;

    // Kirim email ke semua subscriber sekaligus (batch)
    await resend.batch.send(
      emails.map(email => ({
        from: 'Rizqaputra <onboarding@resend.dev>',
        to: email,
        subject: `🎨 Source Baru: ${sourceTitle}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #0c0c0c; color: #fff; border-radius: 12px;">
            <h2 style="color: #FF6B35; margin-bottom: 8px;">Source Baru Tersedia!</h2>
            <h3 style="margin-bottom: 16px;">${sourceTitle}</h3>
            ${sourceThumbnail ? `<img src="${sourceThumbnail}" alt="${sourceTitle}" style="width: 100%; border-radius: 8px; margin-bottom: 16px;" />` : ''}
            ${sourceDescription ? `<p style="color: #aaa; margin-bottom: 24px;">${sourceDescription}</p>` : ''}
            <a href="${sourceUrl}" style="display: inline-block; padding: 14px 28px; background: #FF6B35; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold; letter-spacing: 0.08em; text-transform: uppercase; font-size: 12px;">
              Lihat Source →
            </a>
            <hr style="border: none; border-top: 1px solid #222; margin: 32px 0;" />
            <p style="color: #444; font-size: 11px;">Kamu mendapat email ini karena subscribe di portfolio rizqaputra.com. <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/unsubscribe?email=${email}" style="color: #666;">Unsubscribe</a></p>
          </div>
        `,
      }))
    );

    return NextResponse.json({ success: true, sent: emails.length });
  } catch (err) {
    console.error('Notify error:', err);
    return NextResponse.json({ error: 'Gagal kirim notifikasi' }, { status: 500 });
  }
}
