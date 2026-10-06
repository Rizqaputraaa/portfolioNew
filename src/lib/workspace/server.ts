import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { Role, FeedStatus } from './types';

const SESSION_DAYS = 14;
const MAX_ATTEMPTS = 10;
const LOCK_MINUTES = 10;
export const BUCKET = 'workspace';

/* ── PIN hashing ──────────────────────────────────────────────────────── */

export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(pin, salt, 32).toString('hex')}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const a = Buffer.from(hash, 'hex');
  const b = scryptSync(pin, salt, 32);
  return a.length === b.length && timingSafeEqual(a, b);
}

/* ── Signed session cookie ────────────────────────────────────────────── */

interface Session {
  pid: string;   // project id
  slug: string;
  role: Role;
  name: string;
  exp: number;   // unix seconds
}

function secret(): string {
  return process.env.WORKSPACE_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export const cookieName = (slug: string) => `ws_${slug}`;

export function createSessionCookie(s: Omit<Session, 'exp'>): string {
  const body = Buffer.from(
    JSON.stringify({ ...s, exp: Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400 }),
  ).toString('base64url');
  return `${body}.${sign(body)}`;
}

export function readSession(req: NextRequest, slug: string): Session | null {
  if (!secret()) return null;
  const raw = req.cookies.get(cookieName(slug))?.value;
  if (!raw) return null;
  const [body, sig] = raw.split('.');
  if (!body || !sig) return null;
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const s = JSON.parse(Buffer.from(body, 'base64url').toString()) as Session;
    if (s.exp < Date.now() / 1000 || s.slug !== slug) return null;
    return s;
  } catch {
    return null;
  }
}

export function setSessionCookie(res: NextResponse, slug: string, value: string) {
  res.cookies.set(cookieName(slug), value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DAYS * 86400,
  });
}

/* ── Guards ───────────────────────────────────────────────────────────── */

export const fail = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });

export function db() {
  return getSupabaseAdmin();
}

export function requireSession(req: NextRequest, slug: string) {
  const s = readSession(req, slug);
  return s ?? null;
}

/* ── PIN-only login with project-level lockout ─────────────────────── */

export async function checkLogin(slug: string, pin: string) {
  const client = db();
  if (!client) return { error: 'Server belum siap', status: 500 as const };

  const { data: project } = await client
    .from('ws_projects').select('id, slug, name, failed_attempts, locked_until').eq('slug', slug).maybeSingle();
  if (!project) return { error: 'Workspace tidak ditemukan', status: 404 as const };

  if (project.locked_until && new Date(project.locked_until) > new Date()) {
    return { error: 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.', status: 429 as const };
  }

  const { data: members } = await client
    .from('ws_members').select('id, role, name, pin_hash').eq('project_id', project.id);

  // The PIN itself identifies the member, so PINs must be unique within a project (the seed script ensures it).
  const member = (members ?? []).find(m => verifyPin(pin, m.pin_hash));

  if (!member) {
    const attempts = (project.failed_attempts ?? 0) + 1;
    const lock = attempts >= MAX_ATTEMPTS;
    await client.from('ws_projects').update({
      failed_attempts: lock ? 0 : attempts,
      locked_until: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null,
    }).eq('id', project.id);
    return { error: 'PIN salah', status: 401 as const };
  }

  if (project.failed_attempts) {
    await client.from('ws_projects').update({ failed_attempts: 0, locked_until: null }).eq('id', project.id);
  }
  return { project, member };
}

/* ── Permissions ──────────────────────────────────────────────────────── */

// Who may move a feed to which status (and from which).
export const TRANSITIONS: Record<string, { roles: Role[]; from: FeedStatus[]; to: FeedStatus }> = {
  // Danta drafts the brief, optionally has the client check it, then alone sends it to the designer.
  send_brief_to_client: { roles: ['gozi'], from: ['brief'], to: 'brief_review' },
  send_to_designer: { roles: ['gozi'], from: ['brief', 'brief_review'], to: 'design' },
  send_to_review: { roles: ['designer'], from: ['design', 'revision'], to: 'review' },
  request_revision: { roles: ['gozi'], from: ['review'], to: 'revision' },
  approve: { roles: ['gozi'], from: ['review'], to: 'approved' },
  mark_posted: { roles: ['gozi', 'client'], from: ['approved'], to: 'posted' },
};

export const MAX_REVISIONS = 2;

/* ── "New" badges ─────────────────────────────────────────────────────── */

type Db = NonNullable<ReturnType<typeof db>>;

/**
 * Records a change and marks the feed as already seen by whoever made it.
 * `isPublic = false` is for internal activity the client must not be notified about.
 */
export async function touch(client: Db, feedId: string, role: Role, isPublic = true) {
  const now = new Date().toISOString();
  await client.from('ws_feeds')
    .update(isPublic ? { updated_at: now, team_updated_at: now } : { team_updated_at: now })
    .eq('id', feedId);
  await client.from('ws_reads').upsert({ feed_id: feedId, role, seen_at: now }, { onConflict: 'feed_id,role' });
}

/** Called when someone opens a feed. */
export async function markSeen(client: Db, feedId: string, role: Role) {
  await client.from('ws_reads').upsert(
    { feed_id: feedId, role, seen_at: new Date().toISOString() },
    { onConflict: 'feed_id,role' },
  );
}

/** Marks the brief content (text, files or links) as changed, which re-opens the client's confirmation. */
export async function briefChanged(client: Db, feedId: string) {
  await client.from('ws_feeds').update({ brief_changed_at: new Date().toISOString() }).eq('id', feedId);
}
