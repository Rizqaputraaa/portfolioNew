import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getProjectBySlug, getProjectsByCategory, getCategoryLabels } from '@/lib/db';
import type { Project } from '@/types';
import CoverSlider from './CoverSlider';
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
  // All monochrome — gray on dark
  return { label, bg: '#1c1c1c', color: '#787878' };
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
            {project.is_new && <span className={styles.badge}>NEW</span>}
            <h1 className={styles.title}>{project.title}</h1>

            <div className={styles.meta}>
              {project.client && (
                <span className={styles.metaItem}>
                  <span className={styles.metaLabel}>Client</span>
                  {project.client}
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

      {/* ── Image sections ── */}
      {project.sections && project.sections.length > 0 && (
        <div className={styles.sectionsWrapper}>
          {project.sections.map((sec, idx) => (
            <section key={idx} className={styles.contentSection}>
              {/* Large image — only show if image exists */}
              {sec.image && (
                <div className={styles.sectionImageWrap}>
                  <Image
                    src={sec.image}
                    alt={`${project!.title} section ${idx + 1}`}
                    fill
                    className={styles.sectionImage}
                    sizes="(max-width: 768px) 100vw, 90vw"
                  />
                </div>
              )}

              {/* Caption */}
              <div className={styles.sectionCaption}>
                <span className={styles.sectionNum}>
                  {sec.name ? sec.name.toUpperCase() : `Section ${String(idx + 1).padStart(2, '0')}`}
                </span>
                <p className={styles.sectionDesc}>{sec.description}</p>
              </div>
            </section>
          ))}
        </div>
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
