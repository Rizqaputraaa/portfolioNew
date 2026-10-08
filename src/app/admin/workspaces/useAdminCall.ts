'use client';

import { useCallback } from 'react';
import { useAdminAuth } from '../useAdminAuth';

/** fetch helper for /api/admin/*: every call carries the owner's access token, which the server verifies. */
export function useAdminCall() {
  const { supabase } = useAdminAuth();

  return useCallback(async <T,>(path: string, init?: RequestInit): Promise<T> => {
    const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
    const res = await fetch(path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${data.session?.access_token ?? ''}`,
        ...init?.headers,
      },
      cache: 'no-store',
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? 'Terjadi kesalahan');
    return json as T;
  }, [supabase]);
}
