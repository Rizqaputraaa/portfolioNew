export type Role = 'designer' | 'gozi' | 'client';
export type FeedStatus = 'brief' | 'brief_review' | 'design' | 'review' | 'revision' | 'approved' | 'posted';

export const ROLE_LABEL: Record<Role, string> = {
  designer: 'Designer',
  gozi: 'Danta',
  client: 'Client',
};

export const STATUS_LABEL: Record<FeedStatus, string> = {
  brief: 'Brief',
  brief_review: 'Review Brief',
  design: 'Desain',
  review: 'Review',
  revision: 'Revisi',
  approved: 'Disetujui',
  posted: 'Diposting',
};

export const STATUS_ORDER: FeedStatus[] = ['brief', 'brief_review', 'design', 'review', 'revision', 'approved', 'posted'];

export interface Slide {
  position: number;
  headline: string;
  body: string;
}

/** One racket in a feed's promo list. Prices are full rupiah; every field except the name is optional. */
export interface FeedItem {
  id?: string; // row id, only for the team (the library actions need it)
  name: string;
  price_original: number | null;
  price_promo: number | null;
  image_url: string | null;
  // The library photo for this racket (team only). Same racket name = same photo, in every feed and project.
  asset?: { id: string; width: number | null; height: number | null } | null;
}

export interface FeedFile {
  id: string;
  kind: 'brief' | 'design';
  version: number | null;
  slide: number | null;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: Role;
  created_at: string;
  has_preview?: boolean;
}

export interface FeedLink {
  id: string;
  kind: 'reference' | 'result';
  label: string;
  url: string;
  added_by: Role;
  created_at: string;
}

export interface FeedComment {
  id: string;
  role: Role | 'system';
  kind: 'comment' | 'revision' | 'approval' | 'system';
  visibility: 'internal' | 'all';
  body: string;
  version: number | null;
  created_at: string;
}

export interface BriefRevision {
  id: string;
  title: string;
  slides: Slide[];
  items?: FeedItem[] | null; // null = the client did not touch the racket list
  note: string | null;
  status: 'pending' | 'applied' | 'dismissed';
  created_at: string;
}

export interface FeedSummary {
  id: string;
  number: number;
  title: string;
  status: FeedStatus;
  post_date: string | null;
  created_by: Role;
  updated_at: string;
  version: number;       // latest design version (0 = none yet)
  unread?: boolean;      // something changed since this role last opened the feed
  draft_hidden?: boolean; // Danta is still drafting; the client only sees a placeholder
  cover_file_id: string | null;
}

export interface FeedDetail extends FeedSummary {
  caption: string | null;
  slides: Slide[];
  items: FeedItem[];
  files: FeedFile[];
  links: FeedLink[];
  revision: BriefRevision | null; // client's pending brief revision
  brief_confirmed?: boolean;       // client confirmed the current version of the brief
  comments: FeedComment[];
  revisions_used: number;
}

export interface ProjectInfo {
  slug: string;
  name: string;
  month_label: string | null;
  target_feeds: number;
  client_enabled: boolean;
  promo_enabled?: boolean; // briefs use a racket list ("Daftar promo") instead of brief files
}

// No limit in the UI. This is only a technical safety cap so a bad request cannot create thousands of rows.
export const MAX_SLIDES = 50;
