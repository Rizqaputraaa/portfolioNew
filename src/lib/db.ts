import { getSupabase, getSupabaseAdmin } from './supabase';
import type { Project, Source, SourceCategory } from '@/types';

// ─── PROJECTS ────────────────────────────────────────────

export async function getProjects(limit?: number): Promise<Project[]> {
  const db = getSupabase();
  if (!db) return [];

  let query = db
    .from('projects')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: false });

  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) { console.error('getProjects error:', error); return []; }
  return data as Project[];
}

export async function getProjectsByCategory(
  category: string,
  limit?: number
): Promise<Project[]> {
  const db = getSupabase();
  if (!db) return [];

  // Pakai filter PostgREST 'cs' (contains) untuk TEXT[] column
  // Format: {value} — ini syntax array literal PostgreSQL
  let query = db
    .from('projects')
    .select('*')
    .eq('published', true)
    .filter('categories', 'cs', `{${category}}`)
    .order('created_at', { ascending: false });

  if (limit) query = query.limit(limit);

  const { data, error } = await query;

  if (error) {
    console.error('getProjectsByCategory error:', error);
    // Fallback: coba filter pakai kolom category lama (single string)
    let fallback = db
      .from('projects')
      .select('*')
      .eq('published', true)
      .eq('category', category)
      .order('created_at', { ascending: false });
    if (limit) fallback = fallback.limit(limit);
    const { data: fbData } = await fallback;
    return (fbData ?? []) as Project[];
  }

  return (data ?? []) as Project[];
}

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  const db = getSupabase();
  if (!db) return null;

  const { data, error } = await db
    .from('projects')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .single();

  if (error) { console.error('getProjectBySlug error:', error); return null; }
  return data as Project;
}

// ─── CATEGORIES ─────────────────────────────────────────

/** Ambil label kategori dari DB berdasarkan value-nya. */
export async function getCategoryLabel(value: string): Promise<string> {
  const labels = await getCategoryLabels([value]);
  return labels[0] ?? toTitleCase(value);
}

/** Ambil label untuk beberapa kategori sekaligus (batch query). */
export async function getCategoryLabels(values: string[]): Promise<string[]> {
  if (values.length === 0) return [];
  const db = getSupabaseAdmin();
  if (!db) return values.map(toTitleCase);

  const { data } = await db
    .from('project_categories')
    .select('label, value')
    .in('value', values);

  const map: Record<string, string> = {};
  (data ?? []).forEach((row: { label: string; value: string }) => {
    map[row.value] = row.label;
  });

  return values.map(v => map[v] ?? toTitleCase(v));
}

function toTitleCase(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ─── SOURCES ────────────────────────────────────────────

export async function getSources(limit?: number): Promise<Source[]> {
  const db = getSupabase();
  if (!db) return [];

  let query = db
    .from('sources')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: false });

  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) { console.error('getSources error:', error); return []; }
  return data as Source[];
}

export async function getSourcesByCategory(
  category: SourceCategory,
  limit?: number
): Promise<Source[]> {
  const db = getSupabase();
  if (!db) return [];

  let query = db
    .from('sources')
    .select('*')
    .eq('published', true)
    .eq('category', category)
    .order('created_at', { ascending: false });

  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) { console.error('getSourcesByCategory error:', error); return []; }
  return data as Source[];
}

export async function getSourceBySlug(slug: string): Promise<Source | null> {
  const db = getSupabase();
  if (!db) return null;

  const { data, error } = await db
    .from('sources')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .single();

  if (error) { console.error('getSourceBySlug error:', error); return null; }
  return data as Source;
}
