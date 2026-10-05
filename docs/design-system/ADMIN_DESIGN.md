# Admin Panel — Apple-Inspired Design System

Sistem desain ini berlaku untuk semua halaman `/admin/*`.
Terinspirasi dari Apple Human Interface Guidelines (HIG) — bersih, fungsional, tipografi jelas, kontrol minimal tapi ekspresif.

---

## Philosophy

> "Good design is invisible. It gets out of the way and lets the work speak."
> — Apple HIG principle

Admin panel bukan untuk showoff visual — tugasnya adalah **kecepatan kerja**.
Apple design system unggul di sini: whitespace besar, hierarchy tipografi yang kuat, dan interaksi yang predictable.

---

## Color Palette (Dark Mode — Admin)

Admin menggunakan dark mode sepenuhnya, selaras dengan Apple's Dark Mode system colors.

```css
/* Backgrounds — berlapis seperti material kaca */
--adm-bg:        #000000   /* window background */
--adm-bg-1:      #1C1C1E   /* sidebar, grouped table bg */
--adm-bg-2:      #2C2C2E   /* card, input fill */
--adm-bg-3:      #3A3A3C   /* hover state, secondary fill */

/* Separators */
--adm-sep:       rgba(84, 84, 88, 0.65)   /* opaque separator */
--adm-sep-light: rgba(84, 84, 88, 0.36)   /* non-opaque separator */

/* Labels */
--adm-label-1:   #FFFFFF              /* primary label */
--adm-label-2:   rgba(235,235,245,.6) /* secondary label */
--adm-label-3:   rgba(235,235,245,.3) /* tertiary label */
--adm-label-4:   rgba(235,235,245,.18)/* quaternary label / placeholder */

/* System colors — Apple's canonical dark mode values */
--adm-blue:      #0A84FF   /* links, selection, primary action */
--adm-green:     #30D158   /* success, done state */
--adm-orange:    #FF9F0A   /* warning, medium priority */
--adm-red:       #FF453A   /* destructive, high priority, error */
--adm-yellow:    #FFD60A   /* caution */
--adm-purple:    #BF5AF2   /* misc accent */
--adm-gray:      #8E8E93   /* system gray */
--adm-gray-2:    #636366
--adm-gray-3:    #48484A
--adm-gray-4:    #3A3A3C
--adm-gray-5:    #2C2C2E
--adm-gray-6:    #1C1C1E

/* Brand accent (tetap ada untuk konsistensi) */
--adm-accent:    #D5631A   /* orange brand color — dipakai sparingly */
```

---

## Typography

Gunakan **system font stack** Apple — tidak perlu custom font di admin.

```css
--adm-font: -apple-system, BlinkMacSystemFont, 'SF Pro Display',
             'SF Pro Text', 'Helvetica Neue', Arial, sans-serif;
--adm-font-mono: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
```

### Type Scale (mengikuti Apple HIG)

| Style | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| Large Title | 34px | 700 | 41px | Page hero (jarang di admin) |
| Title 1 | 28px | 700 | 34px | Page title utama |
| Title 2 | 22px | 700 | 28px | Section header |
| Title 3 | 20px | 600 | 25px | Card title |
| Headline | 17px | 600 | 22px | List item title |
| Body | 17px | 400 | 22px | Paragraf / deskripsi |
| Callout | 16px | 400 | 21px | Secondary body text |
| Subhead | 15px | 400 | 20px | Caption besar |
| Footnote | 13px | 400 | 18px | Label, meta info |
| Caption 1 | 12px | 400 | 16px | Badge, timestamp |
| Caption 2 | 11px | 400 | 13px | Very small label |

---

## Spacing — 8pt Grid

Semua spacing adalah kelipatan 4 atau 8.

```
4px   — micro gap (antara icon dan teks)
8px   — small (gap dalam komponen)
12px  — compact (padding dalam list item)
16px  — base (padding card, gap antar section)
20px  — medium (form group gap)
24px  — large (padding section)
32px  — xlarge (padding halaman)
40px  — 2xlarge
48px  — 3xlarge
64px  — section gap besar
```

---

## Corner Radius

| Element | Radius |
|---------|--------|
| Modal / sheet | 12px |
| Card | 10px |
| Button | 10px |
| Input / field | 10px |
| Chip / badge | 100px (pill) |
| Menu | 12px |
| Small control | 6px |

---

## Elevation & Shadow

Apple dark mode menggunakan shadow sangat subtle — tidak seperti material design yang dramatis.

```css
/* Level 1 — card di atas background */
box-shadow: 0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.6);

/* Level 2 — dropdown / popover */
box-shadow: 0 4px 16px rgba(0,0,0,0.5), 0 1px 4px rgba(0,0,0,0.4);

/* Level 3 — modal */
box-shadow: 0 20px 60px rgba(0,0,0,0.7), 0 4px 16px rgba(0,0,0,0.5);

/* Focused input ring */
box-shadow: 0 0 0 3px rgba(10, 132, 255, 0.4);
```

---

## Components

### Sidebar
```
width: 220px
background: #1C1C1E
border-right: 1px solid rgba(84,84,88,0.65)
font: 14px / -apple-system
nav item height: 36px
active: background rgba(255,255,255,0.1) + blue accent left border
```

### List / Table Row
```
height: 44px minimum (Apple touch target)
separator: 1px rgba(84,84,88,0.36) — inset (tidak full width)
hover: rgba(255,255,255,0.05)
```

### Button — Primary
```
background: #0A84FF
color: #FFFFFF
height: 36px
padding: 0 16px
border-radius: 10px
font: 15px semibold
```

### Button — Secondary / Tinted
```
background: rgba(10,132,255,0.15)
color: #0A84FF
border: none
(no border — Apple style)
```

### Button — Destructive
```
color: #FF453A
background: transparent (tertiary) atau rgba(255,69,58,0.15) (tinted)
```

### Input / Text Field
```
background: rgba(255,255,255,0.06)
border: 1px solid rgba(84,84,88,0.65)
border-radius: 10px
height: 36px
padding: 0 12px
font: 15px
focus-ring: 0 0 0 3px rgba(10,132,255,0.4)
placeholder: rgba(235,235,245,0.3)
```

### Toggle / Checkbox
```
Gunakan native atau custom toggle dengan:
on: background #30D158 (green) atau #0A84FF (blue)
off: background rgba(120,120,128,0.32)
thumb: white circle dengan shadow
```

### Badge / Chip
```
padding: 2px 8px
border-radius: 100px
font: 11px semibold uppercase
```

---

## Motion

Apple menggunakan spring animation yang terasa responsif dan fisik.

```css
/* Standar transition */
transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);

/* Spring-like (gunakan untuk list item, toggle) */
transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);

/* Subtle hover */
transition: background 0.15s ease, opacity 0.15s ease;
```

---

## Do & Don't

### ✅ Do
- Gunakan whitespace besar — jangan cramped
- Typography hierarchy yang jelas
- Destructive action selalu merah, bukan abu
- Konfirmasi sebelum hapus (alert/modal)
- Separator halus, bukan border tebal
- Icon monochrome, bukan colorful

### ❌ Don't
- Terlalu banyak warna aksen dalam satu tampilan
- Border di semua sisi card (Apple pakai background fill, bukan border)
- Shadow terlalu tebal / dramatis
- Teks semua caps kecuali badge sangat kecil
- Rounded corner terlalu kecil (< 8px) atau terlalu besar (> 16px untuk komponen kecil)

---

## File Organization

```
src/app/admin/
├── design/                    ← (opsional) design tokens khusus admin
│   └── tokens.css
├── layout.tsx                 # Shell + sidebar
├── layout.module.css          # Sidebar styles (→ migrate ke Apple style)
├── admin.module.css           # Shared component styles
├── useAdminAuth.ts
├── ImageUpload.tsx
├── login/
├── projects/
├── sources/
└── todos/
```

---

## Migration Checklist

Saat mengupdate komponen ke Apple design system:

- [ ] Font → `-apple-system` stack
- [ ] Background → berlapis `#000 / #1C1C1E / #2C2C2E`
- [ ] Border → ganti thick border dengan separator tipis atau background fill
- [ ] Button → radius 10px, no border untuk secondary/tinted
- [ ] Input → radius 10px, focus ring biru
- [ ] List item → 44px min height, inset separator
- [ ] Colors → system colors (#0A84FF, #30D158, #FF453A, #FF9F0A)
- [ ] Shadow → subtle, tidak dramatis
- [ ] Spacing → 8pt grid
