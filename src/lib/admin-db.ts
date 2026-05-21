import { getSupabase } from './supabase';
import type { Project, Source } from '@/types';

// ─── Projects ────────────────────────────────────────────────────────────────

export async function adminGetProjects(): Promise<Project[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error(error.message); return []; }
  return (data ?? []) as Project[];
}

export async function adminGetProject(id: string): Promise<Project | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();
  if (error) { console.error(error.message); return null; }
  return data as Project;
}

export async function adminCreateProject(
  data: Omit<Project, 'id' | 'created_at'>
): Promise<Project | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data: created, error } = await supabase
    .from('projects')
    .insert(data)
    .select()
    .single();
  if (error) { console.error(error.message); return null; }
  return created as Project;
}

export async function adminUpdateProject(
  id: string,
  data: Partial<Omit<Project, 'id' | 'created_at'>>
): Promise<Project | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data: updated, error } = await supabase
    .from('projects')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) { console.error(error.message); return null; }
  return updated as Project;
}

export async function adminDeleteProject(id: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) { console.error(error.message); return false; }
  return true;
}

// ─── Sources ─────────────────────────────────────────────────────────────────

export async function adminGetSources(): Promise<Source[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('sources')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error(error.message); return []; }
  return (data ?? []) as Source[];
}

export async function adminGetSource(id: string): Promise<Source | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('sources')
    .select('*')
    .eq('id', id)
    .single();
  if (error) { console.error(error.message); return null; }
  return data as Source;
}

export async function adminCreateSource(
  data: Omit<Source, 'id' | 'created_at'>
): Promise<Source | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data: created, error } = await supabase
    .from('sources')
    .insert(data)
    .select()
    .single();
  if (error) { console.error(error.message); return null; }
  return created as Source;
}

export async function adminUpdateSource(
  id: string,
  data: Partial<Omit<Source, 'id' | 'created_at'>>
): Promise<Source | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data: updated, error } = await supabase
    .from('sources')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) { console.error(error.message); return null; }
  return updated as Source;
}

export async function adminDeleteSource(id: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { error } = await supabase.from('sources').delete().eq('id', id);
  if (error) { console.error(error.message); return false; }
  return true;
}
