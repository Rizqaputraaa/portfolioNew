/** Kategori project — dinamis dari DB, bisa ditambah lewat admin */
export type ProjectCategory = string;

export type SourceCategory =
  | 'mockup'
  | 'overlay_texture'
  | 'script'
  | 'psd_effect';

/** One content block in the body of a project detail page */
export interface ProjectSection {
  name?: string;
  image: string;
  description: string;
}

export interface Project {
  id: string;
  title: string;
  slug: string;
  category: string;             // legacy — tetap ada di DB untuk backward compat
  categories: string[];         // multi-kategori (array)
  client?: string;              // client / brand name
  client_ig?: string | null;    // instagram handle/URL of client (optional)
  project_date?: string | null; // tanggal project (YYYY-MM-DD)
  thumbnail: string | null;
  images: string[];             // cover images — up to 5, used in the top slider
  tools: string[];
  description: string | null;
  sections?: ProjectSection[];  // body image+caption blocks
  gallery?: string[];           // optional gallery carousel images
  is_new?: boolean; // deprecated — badge now auto-computed from created_at
  published: boolean;
  created_at: string;
}

export interface Source {
  id: string;
  title: string;
  slug: string;
  category: SourceCategory;
  thumbnail: string | null;
  images: string[];
  description: string | null;
  how_to_use: string | null;
  section_image: string | null;  // legacy — single section image
  sections?: ProjectSection[];   // optional multi-section content blocks
  file_size: string | null;
  file_type: string | null;
  dimensions: string | null;
  file_count: number | null;
  drive_url: string | null;      // free download (Google Drive)
  download_url: string | null;   // premium download (Mylynk)
  price: string | null;          // price for premium download (e.g. "$10", "Rp 150.000")
  tutorial_url: string | null;
  published: boolean;
  created_at: string;
}
