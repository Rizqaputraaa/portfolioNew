import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getProjectBySlug, getProjectsByCategory } from '@/lib/db';
import type { Project, ProjectCategory } from '@/types';
import CoverSlider from './CoverSlider';
import styles from './page.module.css';

/* ── Tool icon config ─────────────────────────────────────── */
const TOOL_MAP: Record<string, { label: string; bg: string; color: string }> = {
  photoshop:    { label: 'Ps', bg: '#001e36', color: '#31A8FF' },
  illustrator:  { label: 'Ai', bg: '#1a0a00', color: '#FF9A00' },
  figma:        { label: 'Fg', bg: '#1a0010', color: '#A259FF' },
  after_effects:{ label: 'Ae', bg: '#00001a', color: '#9999FF' },
  premiere_pro: { label: 'Pr', bg: '#1a001a', color: '#EA77FF' },
  lightroom:    { label: 'Lr', bg: '#001a36', color: '#4FBFFF' },
  indesign:     { label: 'Id', bg: '#1a0020', color: '#FF3366' },
  xd:           { label: 'Xd', bg: '#1a0020', color: '#FF61F6' },
  blender:      { label: 'Bd', bg: '#0d0d00', color: '#E87D0D' },
  cinema4d:     { label: 'C4', bg: '#001020', color: '#2087CF' },
};

function getToolConfig(tool: string) {
  const key = tool.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  return TOOL_MAP[key] ?? { label: tool.slice(0, 2).toUpperCase(), bg: '#1a1a1a', color: '#878787' };
}

/* ── Category label map ───────────────────────────────────── */
const CATEGORY_LABELS: Record<ProjectCategory, string> = {
  insta_pack: 'Instagram Pack',
  logo:       'Logo Design',
  poster:     'Poster',
  printing:   'Printing Design',
  ui_design:  'UI Design',
};

/* ── Placeholder data (shown when Supabase is not connected) ─ */
const PLACEHOLDER: Project = {
  id: 'placeholder',
  slug: 'project-01',
  title: 'Instagram Pack BKT',
  category: 'insta_pack',
  client: 'BKT Sneakers',
  thumbnail: null,
  images: [],
  tools: ['photoshop', 'illustrator'],
  description:
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  sections: [
    {
      image: '',
      description:
        'Section 01 — Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.',
    },
    {
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

  if (project.id !== 'placeholder') {
    const all = await getProjectsByCategory(project.category as ProjectCategory, 4);
    related = all.filter(p => p.id !== project!.id).slice(0, 3);
  }

  const catLabel = CATEGORY_LABELS[project.category as ProjectCategory] ?? project.category;

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
              <span className={styles.metaItem}>
                <span className={styles.metaLabel}>Category</span>
                {catLabel}
              </span>
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
              {/* Large image */}
              <div className={styles.sectionImageWrap}>
                {sec.image ? (
                  <Image
                    src={sec.image}
                    alt={`${project!.title} section ${idx + 1}`}
                    fill
                    className={styles.sectionImage}
                    sizes="(max-width: 768px) 100vw, 90vw"
                  />
                ) : (
                  <div className={styles.sectionImagePlaceholder}>IMAGE</div>
                )}
              </div>

              {/* Caption */}
              <div className={styles.sectionCaption}>
                <span className={styles.sectionNum}>Section {String(idx + 1).padStart(2, '0')}</span>
                <p className={styles.sectionDesc}>{sec.description}</p>
              </div>
            </section>
          ))}
        </div>
      )}

      {/* ── Browse more ── */}
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

      {/* Browse more placeholder when no DB */}
      {related.length === 0 && (
        <section className={styles.browseMore}>
          <div className={styles.browseInner}>
            <h2 className={styles.browseTitle}>BROWSE MORE</h2>
            <div className={styles.browseGrid}>
              {['Project 01', 'Project 02', 'Project 03'].map(name => (
                <div key={name} className={styles.browseCard}>
                  <div className={styles.browseThumb}>
                    <span className={styles.browsePlaceholder}>356px × 254px</span>
                  </div>
                  <p className={styles.browseName}>{name}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
