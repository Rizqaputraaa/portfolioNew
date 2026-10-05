# Feature: Todo List

## Purpose
Personal task manager terintegrasi di admin panel. Karena disimpan di Supabase, semua task sync real-time ke semua device yang login sebagai admin.

## Location
Route: `/admin/todos`
Files:
- `src/app/admin/todos/page.tsx` — main component
- `src/app/admin/todos/todos.module.css` — styles

---

## Database

```sql
create table public.todos (
  id          uuid primary key default gen_random_uuid(),
  text        text not null,
  done        boolean default false,
  priority    text default 'normal',  -- 'low' | 'normal' | 'high'
  created_at  timestamptz default now()
);
```

RLS: hanya `authenticated` user yang bisa read/write.

---

## Features

| Feature | Status |
|---------|--------|
| Add task | ✅ |
| Mark done / undone (toggle) | ✅ |
| Priority levels (low/normal/high) | ✅ |
| Filter: All / Active / Done | ✅ |
| Delete single task | ✅ |
| Clear all done tasks | ✅ |
| Cross-device sync (via Supabase) | ✅ |
| Real-time update | — (reload-based, cukup untuk satu user) |

---

## Design Intent

Mengikuti Apple design system (lihat `docs/design-system/ADMIN_DESIGN.md`):
- List item 44px height
- System font stack
- Checkbox toggle Apple-style (green saat done)
- Priority badge sebagai pill chip
- Destruktif action = merah

---

## Potential Improvements

- **Due date** — tambah kolom `due_date` di DB, tampilkan dengan color code
- **Drag to reorder** — tambah kolom `order` integer, pakai dnd-kit
- **Tags / labels** — group tasks by project/category
- **Real-time** — gunakan Supabase Realtime subscription untuk sync instant antar device
- **Keyboard shortcuts** — `Enter` submit, `Cmd+K` clear done
