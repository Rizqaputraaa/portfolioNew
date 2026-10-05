# RIZQAPUTRA Portfolio — Project Overview

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | CSS Modules |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Storage | Supabase Storage (`media` bucket) |
| Fonts | MadeOuterSans (display), AfacadFlux (body) |
| Hosting | Vercel |

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout → SiteShell
│   ├── globals.css             # CSS variables, reset, base
│   ├── page.tsx                # Homepage
│   │
│   ├── about/                  # About Me page
│   ├── portfolio/              # Portfolio list + [slug] detail
│   ├── source/                 # Source list + [slug] detail
│   ├── contact/                # Contact page
│   │
│   ├── admin/                  # ⚙️ Admin panel (auth-protected)
│   │   ├── layout.tsx          # Sidebar shell + auth guard
│   │   ├── page.tsx            # Redirect → /admin/projects
│   │   ├── useAdminAuth.ts     # Session check hook
│   │   ├── ImageUpload.tsx     # Reusable image uploader
│   │   ├── admin.module.css    # Shared admin styles
│   │   ├── login/              # Login page (no sidebar)
│   │   ├── projects/           # Projects CRUD
│   │   ├── sources/            # Sources CRUD
│   │   └── todos/              # Todo list feature
│   │
│   ├── api/
│   │   ├── projects/route.ts   # GET /api/projects
│   │   └── sources/route.ts    # GET /api/sources
│   │
│   └── components/             # Page-level components
│       ├── HeroSection/
│       ├── FeaturedSlider/
│       ├── GridSection/
│       ├── MarqueeSection/
│       ├── TechStrip/
│       ├── NewsletterSection/
│       └── Lanyard3D/
│
├── components/                 # Shared/global components
│   ├── SiteShell.tsx           # Navbar + Footer wrapper
│   ├── Navbar/
│   ├── Footer/
│   ├── PixelBlast/             # WebGL pixel animation
│   └── ProjectCard/
│
├── lib/
│   ├── supabase.ts             # Supabase client (singleton)
│   ├── db.ts                   # Public DB queries
│   ├── admin-db.ts             # Admin CRUD queries
│   └── upload.ts               # Supabase Storage upload helper
│
└── types/
    └── index.ts                # Project, Source, Section types
```

---

## Database Tables

### `projects`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| title | text | |
| slug | text | unique, used in URL |
| category | text | e.g. "Branding" |
| client | text | nullable |
| description | text | nullable |
| tools | text[] | array of tool names |
| images | text[] | array of public URLs |
| thumbnail | text | single image URL |
| sections | jsonb | `[{ title, body, image }]` |
| is_new | boolean | shows NEW badge |
| published | boolean | hides from public if false |
| created_at | timestamptz | |

### `sources`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| title | text | |
| slug | text | unique |
| category | text | |
| description | text | nullable |
| how_to_use | text | nullable |
| images | text[] | |
| section_image | text | nullable |
| file_size | text | nullable |
| file_type | text | nullable |
| dimensions | text | nullable |
| file_count | integer | nullable |
| drive_url | text | preferred download |
| download_url | text | fallback download |
| tutorial_url | text | if set → Watch Tutorial button shows |
| is_new | boolean | |
| published | boolean | |
| created_at | timestamptz | |

### `todos`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| text | text | task description |
| done | boolean | |
| priority | text | 'low' \| 'normal' \| 'high' |
| created_at | timestamptz | |

---

## CSS Design Tokens (Public Site)

```css
--bg:          #0C0C0C   /* page background */
--bg-2:        #141414   /* card / section */
--bg-3:        #1a1a1a   /* input / inner card */
--white:       #F4F4F4   /* primary text */
--gray:        #878787   /* secondary text */
--gray-light:  #2a2a2a   /* borders / dividers */
--orange:      #D5631A   /* primary accent */
--orange-hover:#e8712a
--font:        'MadeOuterSans'   /* display / headings */
--font-sub:    'AfacadFlux'     /* body / UI text */
--radius:      12px
```

---

## Key Patterns

### Auth guard
All `/admin/*` routes (except `/admin/login`) are protected by `useAdminAuth()` hook inside `AdminLayout`.

### URL-based category filter
Portfolio and Source list pages read `?cat=xxx` from URL via `useSearchParams()`. Footer links and category tabs set this param.

### Image upload flow
`ImageUpload.tsx` → `uploadFile(folder, file)` in `lib/upload.ts` → Supabase Storage `media` bucket → returns public URL → stored in DB array.

### Slug auto-generation
In create mode, typing a title auto-generates the slug: lowercase + hyphens. Slug is editable and must be unique.
