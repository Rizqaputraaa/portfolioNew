import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const OWNER_EMAIL = process.env.OWNER_EMAIL ?? 'hello@rizqaputra.com';

export async function POST(req: NextRequest) {
  try {
    const { name, email, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Semua field harus diisi' }, { status: 400 });
    }

    await resend.emails.send({
      from: 'Contact Form <onboarding@resend.dev>',
      to: OWNER_EMAIL,
      replyTo: email,
      subject: `[Portfolio] Pesan dari ${name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #0c0c0c; color: #fff; border-radius: 12px;">
          <h2 style="color: #FF6B35; margin-bottom: 24px;">📬 Pesan Baru dari Portfolio</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; color: #888; width: 100px; vertical-align: top;">Nama</td>
              <td style="padding: 10px 0; font-weight: bold;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #888; vertical-align: top;">Email</td>
              <td style="padding: 10px 0;"><a href="mailto:${email}" style="color: #FF6B35;">${email}</a></td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #888; vertical-align: top;">Pesan</td>
              <td style="padding: 10px 0; white-space: pre-wrap;">${message}</td>
            </tr>
          </table>
          <hr style="border: none; border-top: 1px solid #222; margin: 24px 0;" />
          <p style="color: #555; font-size: 12px;">Dikirim melalui contact form portfolio rizqaputra.com</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Contact error:', err);
    return NextResponse.json({ error: 'Gagal mengirim pesan' }, { status: 500 });
  }
}
