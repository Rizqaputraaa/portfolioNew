import { NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * Server-side check that the caller really is the site owner.
 *
 * The admin pages guard themselves in the browser only, which is fine for showing a page but not for
 * data: these endpoints return every client's projects and create PINs. The browser sends its Supabase
 * access token; we verify it here and require the e-mail to be on the allow-list
 * (ADMIN_EMAILS, comma separated; defaults to the admin account), so a random sign-up could never pass.
 */
export async function requireAdmin(req: NextRequest): Promise<{ email: string; client: SupabaseClient } | null> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const client = getSupabaseAdmin();
  if (!client) return null;

  const { data, error } = await client.auth.getUser(token);
  const email = data.user?.email?.toLowerCase();
  if (error || !email) return null;

  const allowed = (process.env.ADMIN_EMAILS ?? 'admin@rizqaputra.com')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(email) ? { email, client } : null;
}
