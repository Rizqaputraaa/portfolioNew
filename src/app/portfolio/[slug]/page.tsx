import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getProjectBySlug, getProjectsByCategory, getCategoryLabels } from '@/lib/db';
import { isNewItem } from '@/lib/utils';
import type { Project } from '@/types';
import CoverSlider from './CoverSlider';
import SectionImagesClient from './SectionImagesClient';
import GalleryCarousel from './GalleryCarousel';
import styles from './page.module.css';

/* ── Tool icon config — monochrome palette ────────────────── */
const TOOL_LABELS: Record<string, string> = {
  photoshop:    'Ps',
  illustrator:  'Ai',
  figma:        'Fg',
  after_effects:'Ae',
  premiere_pro: 'Pr',
  lightroom:    'Lr',
  indesign:     'Id',
  xd:           'Xd',
  blender:      'Bd',
  cinema4d:     'C4',
};

function getToolConfig(tool: string) {
  const key = tool.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  const label = TOOL_LABELS[key] ?? tool.slice(0, 2).toUpperCase();
  return { label, bg: '#1c1c1c', color: '#787878' };
}

/* ── IG client helper ─────────────────────────────────────── */
function parseClientIg(raw: string): { href: string; handle: string } {
  const trimmed = raw.trim();
  // Full URL → extract username
  const urlMatch = trimmed.match(/instagram\.com\/([^/?#]+)/i);
  if (urlMatch) {
    return {
      href: `https://www.instagram.com/${urlMatch[1]}/`,
      handle: `@${urlMatch[1]}`,
    };
  }
  // @handle or plain handle
  const handle = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
  return {
    href: `https://www.instagram.com/${handle}/`,
    handle: `@${handle}`,
  };
}

/* ── Placeholder data (shown when Supabase is not connected) ─ */
const PLACEHOLDER: Project = {
  id: 'placeholder',
  slug: 'project-01',
  title: 'Instagram Pack BKT',
  category: 'insta_pack',
  categories: ['insta_pack'],
  client: 'BKT Sneakers',
  thumbnail: null,
  images: [],
  tools: ['photoshop', 'illustrator'],
  description:
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  sections: [
    {
      name: 'Section 01',
      image: '',
      description:
        'Section 01 — Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.',
    },
    {
      name: 'Section 02',
      image: '',
      description:
        'Section 02 — Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    },
  ],
  is_new: true,
  published: true,
  created_at: new Date().toISOString(),
};

/* ── Page ─────────────────────────────────────────────────── */
export default async function ProjectPage({
  params,
}: {
  params: { slug: string };
}) {
  /* Fetch project — fall back to placeholder when DB is not wired up */
  let project: Project | null = await getProjectBySlug(params.slug);
  let related: Project[] = [];

  if (!project) {
    /* Use placeholder only for the demo slug, otherwise 404 */
    if (params.slug === PLACEHOLDER.slug) {
      project = PLACEHOLDER;
    } else {
      notFound();
    }
  }

  // Ambil categories dari field baru, fallback ke legacy category
  const projectCategories = project.categories?.length
    ? project.categories
    : (project.category ? [project.category] : []);

  if (project.id !== 'placeholder') {
    // Ambil related project berdasarkan kategori pertama
    const all = await getProjectsByCategory(projectCategories[0] ?? project.category, 4);
    related = all.filter(p => p.id !== project!.id).slice(0, 3);
  }

  // Fetch semua label kategori dari DB sekaligus
  const catLabels = await getCategoryLabels(projectCategories);

  return (
    <div className={styles.page}>
      {/* ── Cover slider ── */}
      <div className={styles.sliderWrapper}>
        <CoverSlider images={project.images} title={project.title} />
      </div>

      {/* ── Main info ── */}
      <section className={styles.infoSection}>
        <div className={styles.infoInner}>

          {/* Left — title, meta, description */}
          <div className={styles.infoLeft}>
            {isNewItem(project.project_date ?? project.created_at) && <span className={styles.badge}>NEW</span>}
            <h1 className={styles.title}>{project.title}</h1>

            <div className={styles.meta}>
              {project.client && (
                <span className={styles.metaItem}>
                  <span className={styles.metaLabel}>Client</span>
                  <span className={styles.metaClientRow}>
                    {project.client}
                    {project.client_ig && (() => {
                      const ig = parseClientIg(project.client_ig);
                      return (
                        <a
                          href={ig.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.metaIgLink}
                          title={`Instagram ${ig.handle}`}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
                          </svg>
                          {ig.handle}
                        </a>
                      );
                    })()}
                  </span>
                </span>
              )}
              {catLabels.length > 0 && (
                <span className={styles.metaItem}>
                  <span className={styles.metaLabel}>
                    {catLabels.length > 1 ? 'Categories' : 'Category'}
                  </span>
                  {catLabels.join(', ')}
                </span>
              )}
              {project.project_date && (
                <span className={styles.metaItem}>
                  <span className={styles.metaLabel}>Date</span>
                  {new Date(project.project_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long' })}
                </span>
              )}
            </div>

            {project.description && (
              <p className={styles.description}>{project.description}</p>
            )}
          </div>

          {/* Right — tools */}
          {project.tools && project.tools.length > 0 && (
            <div className={styles.toolsPanel}>
              <h3 className={styles.toolsHeading}>Tools</h3>
              <div className={styles.toolsGrid}>
                {project.tools.map(tool => {
                  const cfg = getToolConfig(tool);
                  return (
                    <div
                      key={tool}
                      className={styles.toolBadge}
                      style={{ background: cfg.bg }}
                      title={tool}
                    >
                      <span style={{ color: cfg.color }}>{cfg.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </section>

      {/* ── Image sections (client component: nama di atas gambar, click-to-lightbox) ── */}
      {project.sections && project.sections.length > 0 && (
        <SectionImagesClient
          sections={project.sections}
          projectTitle={project.title}
        />
      )}

      {/* ── Gallery carousel (optional) ── */}
      {project.gallery && project.gallery.length > 0 && (
        <GalleryCarousel images={project.gallery} title={project.title} />
      )}

      {/* ── Browse more — only show if related projects exist ── */}
      {related.length > 0 && (
        <section className={styles.browseMore}>
          <div className={styles.browseInner}>
            <h2 className={styles.browseTitle}>BROWSE MORE</h2>
            <div className={styles.browseGrid}>
              {related.map(p => (
                <Link key={p.id} href={`/portfolio/${p.slug}`} className={styles.browseCard}>
                  <div className={styles.browseThumb}>
                    {p.thumbnail ? (
                      <Image
                        src={p.thumbnail}
                        alt={p.title}
                        fill
                        className={styles.browseThumbImg}
                        sizes="(max-width: 768px) 50vw, 33vw"
                      />
                    ) : (
                      <span className={styles.browsePlaceholder}>356px × 254px</span>
                    )}
                  </div>
                  <p className={styles.browseName}>{p.title}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Contact CTA — only on project detail (DM / Email) ── */}
      <section className={styles.contactCta}>
        <div className={styles.ctaInner}>
          <div className={styles.ctaText}>
            <h3>LET&apos;S WORK TOGETHER</h3>
            <p>Have a project in mind? Let&apos;s talk.</p>
          </div>
          <div className={styles.ctaActions}>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.ctaBtnDm}
            >
              DM
            </a>
            <a
              href="mailto:hello@rizqaputra.com"
              className={styles.ctaBtnEmail}
            >
              EMAIL
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
