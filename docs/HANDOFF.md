# Handoff Note — Admin Todos Apple Design

**Date:** 2026-10-05
**Status:** In progress

## Apa yang sudah selesai

- Admin panel lengkap (login, projects CRUD, sources CRUD, todos)
- Todos page: `/admin/todos` — page.tsx + todos.module.css (Apple style 80%)
- Docs folder:
  - `docs/OVERVIEW.md` — struktur project lengkap
  - `docs/design-system/ADMIN_DESIGN.md` — Apple HIG reference
  - `docs/features/TODOS.md` — spec fitur todos
- Skill `apple-design` dari emilkowalski/skills sudah diinstall

## File yang perlu di-copy ke main project

File ada di worktree:
`D:\Website\2026newPortfolio\.claude\worktrees\quirky-chandrasekhar-5d4a7f\`

```
src/app/admin/todos/page.tsx
src/app/admin/todos/todos.module.css
docs/OVERVIEW.md
docs/design-system/ADMIN_DESIGN.md
docs/features/TODOS.md
```

Copy ke: `D:\Website\2026newPortfolio\`

## Yang belum selesai

- [ ] Todos sidebar link belum ditambahkan ke `layout.tsx`
  → Tambah `{ href: '/admin/todos', label: 'Todos', icon: '◻' }` ke `NAV_LINKS`
- [ ] Apple design system belum di-apply penuh ke Todos page
  → Perlu jalankan `/apple-design` skill dulu
- [ ] Admin shell (sidebar, layout) belum di-redesign ke Apple style

## Supabase — todos table SQL (jalankan kalau belum)

```sql
create table public.todos (
  id          uuid primary key default gen_random_uuid(),
  text        text not null,
  done        boolean default false,
  priority    text default 'normal',
  created_at  timestamptz default now()
);

alter table public.todos enable row level security;

create policy "Authenticated full access todos"
  on public.todos for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
```
