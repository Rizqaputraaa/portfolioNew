import { getSupabase, getSupabaseAdmin } from './supabase';
import type { Project, Source, ProjectCategory, SourceCategory } from '@/types';

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
  category: ProjectCategory,
  limit?: number
): Promise<Project[]> {
  const db = getSupabase();
  if (!db) return [];

  let query = db
    .from('projects')
    .select('*')
    .eq('published', true)
    .eq('category', category)
    .order('created_at', { ascending: false });

  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) { console.error('getProjectsByCategory error:', error); return []; }
  return data as Project[];
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

/** Ambil label kategori dari DB berdasarkan value-nya.
 *  Fallback: kembalikan value itu sendiri (dengan underscore diganti spasi, title-case). */
export async function getCategoryLabel(value: string): Promise<string> {
  const db = getSupabaseAdmin();
  if (!db) return toTitleCase(value);

  const { data } = await db
    .from('project_categories')
    .select('label')
    .eq('value', value)
    .single();

  return data?.label ?? toTitleCase(value);
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
