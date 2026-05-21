'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import type { User, SupabaseClient } from '@supabase/supabase-js';

interface AdminAuthResult {
  loading: boolean;
  user: User | null;
  supabase: SupabaseClient | null;
}

export function useAdminAuth(): AdminAuthResult {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const supabase = getSupabase();

  useEffect(() => {
    if (!supabase) {
      router.push('/admin/login');
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push('/admin/login');
      } else {
        setUser(data.session.user);
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push('/admin/login');
        setUser(null);
      } else {
        setUser(session.user);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [router, supabase]);

  return { loading, user, supabase };
}
