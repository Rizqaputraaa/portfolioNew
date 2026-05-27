'use client';

import { useState } from 'react';
import Image from 'next/image';
import ImageLightbox from '@/components/ImageLightbox/ImageLightbox';
import type { ProjectSection } from '@/types';
import styles from './page.module.css';

interface Props {
  sections: ProjectSection[];
  sourceTitle: string;
}

export default function SourceSectionsClient({ sections, sourceTitle }: Props) {
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

  if (!sections || sections.length === 0) return null;

  return (
    <>
      <div className={styles.sectionsWrapper}>
        {sections.map((sec, idx) => (
          <section key={idx} className={styles.contentSection}>

            {/* Section name above image */}
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNum}>
                {sec.name ? sec.name.toUpperCase() : `Section ${String(idx + 1).padStart(2, '0')}`}
              </span>
            </div>

            {/* Image — clickable to open lightbox */}
            {sec.image && (
              <div
                className={`${styles.sectionImageWrap} ${styles.clickable}`}
                onClick={() => setLightbox({
                  src: sec.image,
                  alt: `${sourceTitle} — ${sec.name ?? `Section ${idx + 1}`}`,
                })}
                title="Klik untuk memperbesar"
              >
                <Image
                  src={sec.image}
                  alt={`${sourceTitle} section ${idx + 1}`}
                  fill
                  className={styles.sectionImage}
                  sizes="(max-width: 768px) 100vw, 90vw"
                />
                <div className={styles.imageZoomHint}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
                  </svg>
                </div>
              </div>
            )}

            {/* Description */}
            {sec.description && (
              <div className={styles.sectionCaption}>
                <p className={styles.sectionDesc}>{sec.description}</p>
              </div>
            )}
          </section>
        ))}
      </div>

      {lightbox && (
        <ImageLightbox
          src={lightbox.src}
          alt={lightbox.alt}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
}
