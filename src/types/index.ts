export type ProjectCategory =
  | 'insta_pack'
  | 'logo'
  | 'poster'
  | 'printing'
  | 'ui_design';

export type SourceCategory =
  | 'mockup'
  | 'overlay_texture'
  | 'script'
  | 'psd_effect';

/** One content block in the body of a project detail page */
export interface ProjectSection {
  image: string;
  description: string;
}

export interface Project {
  id: string;
  title: string;
  slug: string;
  category: ProjectCategory;
  client?: string;              // client / brand name
  thumbnail: string | null;
  images: string[];             // cover images — up to 5, used in the top slider
  tools: string[];
  description: string | null;
  sections?: ProjectSection[];  // body image+caption blocks
  is_new: boolean;
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
  section_image: string | null;
  file_size: string | null;
  file_type: string | null;
  dimensions: string | null;
  file_count: number | null;
  drive_url: string | null;      // free download (Google Drive)
  download_url: string | null;   // premium download (Mylynk)
  tutorial_url: string | null;
  published: boolean;
  created_at: string;
}
