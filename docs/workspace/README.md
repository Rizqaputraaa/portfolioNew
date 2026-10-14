# Workspace system

Private client workspace for Instagram feed packs, plus the owner dashboard that is the home of `/admin`. Next.js 14 (App Router) · Supabase (Postgres + private Storage) · Vercel (auto-deploy on push to `main`).

Schema source of truth: [`workspace.sql`](./workspace.sql) (idempotent, versions v1–v10).

## Surfaces

| Surface | URL | Access |
|---|---|---|
| Client workspace | `/w/<slug>` and `/w/<slug>/<n>` (redirect to `/workspace/<slug>`) | PIN only |
| Owner dashboard | `/admin/workspaces` | Supabase login (`ADMIN_EMAILS`, default `admin@rizqaputra.com`) |
| Promo list form | `/f/<form_token>` | secret link, no login |
| Aset Raket tool | `/admin/workspaces/tools/raket?slug=<slug>` | admin |

The old portfolio admin (Projects / Sources / Kategori / Todos) lives inside the same shell.

## Roles and switches

Roles: `designer` (owner), `gozi` (shown as **Danta**, the intermediary who writes briefs and approves; never rename the key), `client`.

Per project (`ws_projects`):
- `client_enabled`: false means the client never logs in; Danta sends results by WhatsApp with a Drive link.
- `danta_enabled`: false means the designer session gets `lead: true` and also holds Danta's powers. Use `isLead(session)` / `hasRole(session, role)` from `src/lib/workspace/server.ts`, never compare to `'gozi'` directly.

## Feed flow

`brief` → `brief_review` (only when `client_enabled`) → `design` → `review` → `revision` or `approved` → `posted`.

Transitions are defined in `TRANSITIONS` (`src/lib/workspace/server.ts`): send_brief_to_client, send_to_designer (Danta/lead), send_to_review (designer), request_revision, approve (Danta/lead), mark_posted.

## Behaviour rules

- A Danta-drafted feed in status `brief` is shown to the client only as "Sedang disiapkan".
- Clients see design files and result links only after approval, and never internal comments.
- Client edits to a Danta brief are stored as proposals (`ws_brief_revisions`); Danta applies or dismisses them. "Brief sudah sesuai" works once per brief version (`brief_changed_at` vs `brief_confirmed_at`).
- "Baru" badge per role: `updated_at` (public changes) vs `team_updated_at` (all changes); `ws_reads` stores the last seen time. Every mutation calls `touch()`, every brief content change calls `briefChanged()`.
- Login is PIN-only (the PIN identifies the role; PINs are unique per project). 10 wrong tries lock the project for 10 minutes. Session cookie `ws_<slug>` is HMAC-signed and lasts 14 days. Each member can change their own PIN (4–8 digits).
- Designs are stored as original plus a WebP preview (max 1350 px). Brief files are viewable in the app (image, PDF, docx via mammoth).
- Slides per feed are unlimited in the UI (code cap `MAX_SLIDES = 50`).
- Share links use `NEXT_PUBLIC_SITE_URL` when set, otherwise the current origin. PINs are never put in links.

## Data model (summary)

`ws_projects`, `ws_members`, `ws_feeds`, `ws_slides`, `ws_files`, `ws_links` (kind `reference|result`), `ws_comments`, `ws_brief_revisions`, `ws_reads`, `ws_promo_batches`, `ws_promo_items`. RLS is enabled with no policies: only the server (service role key) reads or writes. Files live in the private bucket `workspace`, served through short-lived signed URLs after a role check.

## Code map

- `src/lib/workspace/`: `server.ts` (session, PIN, lockout, transitions), `feeds.ts` (role-filtered `listFeeds` / `getFeedDetail`), `types.ts`, `admin.ts` (`requireAdmin`), `promo.ts` (rupiah parsing and formatting).
- `src/app/api/ws/[slug]/…`: login, pin, feeds, feeds/[n] (+ action, files, links, revisions), files/[id] (+ preview).
- `src/app/api/admin/ws/…`: overview, projects, projects/[slug], open, promo. `src/app/api/form/[token]`: public promo form.
- `src/app/workspace/[slug]/`: board and feed sheet. `src/app/admin/workspaces/`: dashboard, rail, modals, tools. `src/app/f/[token]/`: client form.

## Promo form and Aset Raket

Clients send padel racket promo lists through the form. Prices are typed like people say them: `3.949` becomes Rp3.949.000 (values under 100.000 are read as thousands). The server revalidates, rejects non-http(s) links and allows 20 batches per hour per project. The owner tool sorts by highest price and splits 5 rackets per feed.

## Scripts

All read `.env.local` (gitignored). Never print or commit its values.

```bash
node scripts/db.mjs --check                          # read-only connection test
node scripts/db.mjs docs/workspace/workspace.sql     # apply the schema
node scripts/ws-seed.mjs <slug> "<name>" "<month>" <feeds>   # create/reset a project, prints new PINs once
node scripts/ws-clear.mjs <slug>                     # delete all feeds and files of a project
node scripts/ws-project.mjs <slug> no-client|with-client|delete [force]
```

For a schema change, append a `-- vN` block to `workspace.sql` and apply it.

## Environment variables (Vercel and `.env.local`)

`DATABASE_URL` (local scripts only), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (the secret key `sb_secret_…`, not the publishable one), optional `NEXT_PUBLIC_SITE_URL`, `ADMIN_EMAILS`, `WORKSPACE_SECRET`.

## Design

Portfolio identity: bg `#0C0C0C`, surfaces `#141414` / `#1A1A1A`, line `#2A2A2A`, orange `#D5631A` (hover `#E8712A`), text `#F4F4F4`, muted `#878787`; MadeOuterSans headings, AfacadFlux body. Apple-style motion (spring `cubic-bezier(0.32,0.72,0,1)`, press feedback, reduced-motion fallbacks). Mobile first: 16px inputs, 44px targets, safe-area padding, no horizontal overflow.

## Open items

Image pipeline for Aset Raket (cutout, rimlight, library, ZIP export), invoices, months/packs views, UI to delete a client or switch Danta mode, hardening of old admin APIs (e.g. unauthenticated `/api/categories` POST), disabling Supabase sign-ups, rotating the DB password and secret key.
