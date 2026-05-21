import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getSourceBySlug, getSourcesByCategory } from '@/lib/db';
import type { Source, SourceCategory } from '@/types';
import CoverSlider from './CoverSlider';
import ShareButton from './ShareButton';
import styles from './page.module.css';

/* ── Category label map ───────────────────────────────────── */
const CATEGORY_LABELS: Record<SourceCategory, string> = {
  mockup:          'Mockup',
  overlay_texture: 'Overlay / Texture',
  script:          'Script',
  psd_effect:      'PSD Effect',
};

/* ── Placeholder data (shown when Supabase is not connected) ─ */
const PLACEHOLDER: Source = {
  id: 'placeholder',
  slug: 'source-01',
  title: 'Minimal Mockup Pack',
  category: 'mockup',
  thumbnail: null,
  images: [],
  description:
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.',
  how_to_use:
    '1. Open the PSD file in Adobe Photoshop.\n2. Double-click the Smart Object layer.\n3. Paste your design and save.\n4. The mockup updates automatically.',
  section_image: null,
  file_size: '48 MB',
  file_type: 'PSD',
  dimensions: '4000 × 3000 px',
  file_count: 6,
  drive_url: null,
  download_url: null,
  tutorial_url: null,
  published: true,
  created_at: new Date().toISOString(),
};

/* ── Page ─────────────────────────────────────────────────── */
export default async function SourcePage({
  params,
}: {
  params: { slug: string };
}) {
  let source: Source | null = await getSourceBySlug(params.slug);
  let related: Source[] = [];

  if (!source) {
    if (params.slug === PLACEHOLDER.slug) {
      source = PLACEHOLDER;
    } else {
      notFound();
    }
  }

  if (source.id !== 'placeholder') {
    const all = await getSourcesByCategory(source.category as SourceCategory, 4);
    related = all.filter(s => s.id !== source!.id).slice(0, 3);
  }

  const catLabel = CATEGORY_LABELS[source.category as SourceCategory] ?? source.category;

  /* Determine download href — prefer free (drive_url), fallback to paid */
  const downloadHref = source.drive_url ?? source.download_url ?? null;
  const isFree = !!source.drive_url;

  return (
    <div className={styles.page}>

      {/* ── Cover slider ── */}
      <div className={styles.sliderWrapper}>
        <CoverSlider images={source.images} title={source.title} />
      </div>

      {/* ── Main body ── */}
      <div className={styles.body}>

        {/* ── Left column ── */}
        <div className={styles.left}>
          <span className={styles.badge}>{catLabel}</span>
          <h1 className={styles.title}>{source.title}</h1>

          {source.description && (
            <p className={styles.description}>{source.description}</p>
          )}

          {/* Section image */}
          <div className={styles.sectionImageWrap}>
            {source.section_image ? (
              <Image
                src={source.section_image}
                alt={source.title}
                fill
                className={styles.sectionImage}
                sizes="(max-width: 900px) 100vw, 66vw"
              />
            ) : (
              <div className={styles.sectionImagePlaceholder}>IMAGE</div>
            )}
          </div>

          {/* HOW TO USE */}
          {source.how_to_use && (
            <div className={styles.howToUseSection}>
              <h2 className={styles.sectionHeading}>How To Use</h2>
              <p className={styles.howToUseText}>{source.how_to_use}</p>
            </div>
          )}
        </div>

        {/* ── Right column ── */}
        <div className={styles.right}>

          {/* Product details card */}
          <div className={styles.detailCard}>
            <div className={styles.detailCardHead}>
              <span className={styles.detailCardTitle}>Product Details</span>
            </div>
            <div className={styles.detailRows}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Category</span>
                <span className={styles.detailValue}>{catLabel}</span>
              </div>
              {source.file_type && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>File Type</span>
                  <span className={styles.detailValue}>{source.file_type}</span>
                </div>
              )}
              {source.file_size && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>File Size</span>
                  <span className={styles.detailValue}>{source.file_size}</span>
                </div>
              )}
              {source.dimensions && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Dimensions</span>
                  <span className={styles.detailValue}>{source.dimensions}</span>
                </div>
              )}
              {source.file_count != null && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Number of Files</span>
                  <span className={styles.detailValue}>{source.file_count}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className={styles.btnGroup}>
            {downloadHref ? (
              <a
                href={downloadHref}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.btnDownload}
              >
                {/* Download icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {isFree ? 'Free Download' : 'Download'}
              </a>
            ) : (
              <button className={styles.btnDownload} disabled style={{ opacity: 0.5, cursor: 'default' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download
              </button>
            )}

            {source.tutorial_url && (
              <a
                href={source.tutorial_url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.btnTutorial}
              >
                {/* Play icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Watch Tutorial
              </a>
            )}
          </div>

          {/* Share this source */}
          <ShareButton />
        </div>
      </div>

      {/* ── Browse more ── */}
      {related.length > 0 && (
        <section className={styles.browseMore}>
          <div className={styles.browseInner}>
            <h2 className={styles.browseTitle}>BROWSE MORE</h2>
            <div className={styles.browseGrid}>
              {related.map(s => (
                <Link key={s.id} href={`/source/${s.slug}`} className={styles.browseCard}>
                  <div className={styles.browseThumb}>
                    {s.thumbnail ? (
                      <Image
                        src={s.thumbnail}
                        alt={s.title}
                        fill
                        className={styles.browseThumbImg}
                        sizes="(max-width: 768px) 50vw, 33vw"
                      />
                    ) : (
                      <span className={styles.browsePlaceholder}>356px × 254px</span>
                    )}
                  </div>
                  <p className={styles.browseName}>{s.title}</p>
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
              {['Source 01', 'Source 02', 'Source 03'].map(name => (
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

      {/* ── Contact CTA ── */}
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
