import { createClient, SupabaseClient } from '@supabase/supabase-js';

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

// Custom fetch yang disable Next.js cache untuk Supabase
const noStoreFetch = (input: RequestInfo | URL, init?: RequestInit) =>
  fetch(input, { ...init, cache: 'no-store' });

let _supabase: SupabaseClient | null = null;
let _supabaseAdmin: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  if (!isValidUrl(url) || !key) return null;
  if (!_supabase) _supabase = createClient(url, key, {
    global: { fetch: noStoreFetch },
  });
  return _supabase;
}

export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ?? '';
  if (!isValidUrl(url) || !serviceKey) return null;
  if (!_supabaseAdmin) _supabaseAdmin = createClient(url, serviceKey, {
    global: { fetch: noStoreFetch },
  });
  return _supabaseAdmin;
}
