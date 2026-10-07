import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Role, FeedDetail, FeedSummary, FeedFile, FeedComment, FeedLink, Slide, BriefRevision,
} from './types';

interface FeedRow {
  id: string; number: number; title: string; status: FeedDetail['status'];
  post_date: string | null; caption: string | null; created_by: Role; updated_at: string;
  team_updated_at?: string | null;
  brief_changed_at?: string | null;
  brief_confirmed_at?: string | null;
}

const FILE_COLS = 'id, feed_id, kind, version, slide, file_name, mime_type, size_bytes, uploaded_by, created_at, preview_path';

// Never leak storage paths to the browser — expose only whether a preview exists.
type FileRow = FeedFile & { feed_id?: string; preview_path?: string | null };
const toPublicFile = (f: FileRow): FeedFile => {
  const out: Record<string, unknown> = { ...f, has_preview: !!f.preview_path };
  delete out.preview_path;
  delete out.feed_id;
  return out as unknown as FeedFile;
};

/** Highest version that has been sent to review (0 = none). The "open" version is this + 1. */
export function lastSentVersion(comments: Pick<FeedComment, 'kind' | 'role' | 'version'>[]): number {
  return comments
    .filter(c => c.kind === 'system' && c.version != null)
    .reduce((max, c) => Math.max(max, c.version as number), 0);
}

/**
 * What a role is allowed to see:
 *  - designer / gozi: everything
 *  - client: brief + files, only the approved design version, only "all"-visibility comments
 */
function filterForRole(role: Role, status: FeedRow['status'], files: FeedFile[], comments: FeedComment[]) {
  if (role !== 'client') return { files, comments };

  const approved = status === 'approved' || status === 'posted';
  const sent = lastSentVersion(comments);
  return {
    files: files.filter(f => f.kind === 'brief' || (approved && f.version === sent)),
    comments: comments.filter(c => c.visibility === 'all'),
  };
}

export async function listFeeds(client: SupabaseClient, projectId: string, role: Role): Promise<FeedSummary[]> {
  const { data: feeds } = await client
    .from('ws_feeds').select('*').eq('project_id', projectId).order('number');
  const rows = (feeds ?? []) as FeedRow[];
  if (!rows.length) return [];

  const ids = rows.map(r => r.id);
  const [{ data: files }, { data: comments }, { data: reads }] = await Promise.all([
    client.from('ws_files').select(FILE_COLS).in('feed_id', ids).eq('kind', 'design'),
    client.from('ws_comments').select('feed_id, kind, role, version, visibility, id, body, created_at')
      .in('feed_id', ids).eq('kind', 'system'),
    client.from('ws_reads').select('feed_id, seen_at').in('feed_id', ids).eq('role', role),
  ]);
  const seenAt = new Map((reads ?? []).map(x => [x.feed_id as string, x.seen_at as string]));

  return rows.map(r => {
    const hidden = role === 'client' && r.status === 'brief' && r.created_by === 'gozi';
    const feedFiles = ((files ?? []) as (FeedFile & { feed_id: string })[]).filter(f => f.feed_id === r.id);
    const sent = lastSentVersion(
      ((comments ?? []) as (FeedComment & { feed_id: string })[]).filter(c => c.feed_id === r.id),
    );
    const approved = r.status === 'approved' || r.status === 'posted';
    // Clients only get a cover once the design is approved; the team sees the newest sent version.
    const canSeeCover = role !== 'client' || approved;
    const cover = canSeeCover
      ? feedFiles.filter(f => f.version === (sent || null) && f.slide === 1)[0]
        ?? feedFiles.filter(f => f.version === sent)[0]
      : undefined;
    return {
      id: r.id, number: r.number, title: hidden ? 'Sedang disiapkan' : r.title, status: r.status,
      post_date: hidden ? null : r.post_date, created_by: r.created_by, updated_at: r.updated_at,
      version: sent, cover_file_id: cover?.id ?? null, draft_hidden: hidden,
      unread: !hidden && (() => {
        const seen = seenAt.get(r.id);
        const changed = role === 'client' ? r.updated_at : (r.team_updated_at ?? r.updated_at);
        return !seen || changed > seen;
      })(),
    };
  });
}

export async function getFeedDetail(
  client: SupabaseClient, projectId: string, number: number, role: Role,
): Promise<FeedDetail | null> {
  const { data: feed } = await client
    .from('ws_feeds').select('*').eq('project_id', projectId).eq('number', number).maybeSingle();
  if (!feed) return null;
  const row = feed as FeedRow;

  // The client never sees what Danta is still drafting.
  if (role === 'client' && row.status === 'brief' && row.created_by === 'gozi') {
    return {
      id: row.id, number: row.number, title: 'Sedang disiapkan', status: row.status,
      post_date: null, caption: null, created_by: row.created_by, updated_at: row.updated_at,
      version: 0, cover_file_id: null, draft_hidden: true,
      slides: [], files: [], links: [], revision: null, comments: [], revisions_used: 0,
    };
  }

  const [{ data: revision }, { data: slides }, { data: files }, { data: comments }, { data: links }] = await Promise.all([
    client.from('ws_brief_revisions').select('id, title, slides, note, status, created_at')
      .eq('feed_id', row.id).eq('status', 'pending').maybeSingle().then(r => ({ data: r.data as BriefRevision | null })),
    client.from('ws_slides').select('position, headline, body').eq('feed_id', row.id).order('position'),
    client.from('ws_files').select(FILE_COLS).eq('feed_id', row.id).order('created_at'),
    client.from('ws_comments').select('id, role, kind, visibility, body, version, created_at')
      .eq('feed_id', row.id).order('created_at'),
    client.from('ws_links').select('id, kind, label, url, added_by, created_at')
      .eq('feed_id', row.id).order('created_at'),
  ]);

  const allComments = (comments ?? []) as FeedComment[];
  const visible = filterForRole(role, row.status, ((files ?? []) as FileRow[]).map(toPublicFile), allComments);
  const sent = lastSentVersion(allComments);
  const cover = visible.files.find(f => f.kind === 'design' && f.version === sent && f.slide === 1)
    ?? visible.files.find(f => f.kind === 'design' && f.version === sent);

  return {
    id: row.id, number: row.number, title: row.title, status: row.status,
    post_date: row.post_date, caption: row.caption, created_by: row.created_by,
    updated_at: row.updated_at, version: sent, cover_file_id: cover?.id ?? null,
    slides: (slides ?? []) as Slide[],
    files: visible.files,
    // Where the finished files can be copied from: the client only sees it once the design is approved.
    links: ((links ?? []) as FeedLink[]).filter(
      l => role !== 'client' || l.kind !== 'result' || row.status === 'approved' || row.status === 'posted',
    ),
    revision: revision ?? null,
    brief_confirmed: !!row.brief_confirmed_at
      && (!row.brief_changed_at || new Date(row.brief_changed_at) <= new Date(row.brief_confirmed_at)),
    comments: visible.comments,
    revisions_used: allComments.filter(c => c.kind === 'revision').length,
  };
}
