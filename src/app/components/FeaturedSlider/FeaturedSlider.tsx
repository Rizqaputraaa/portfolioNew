'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './FeaturedSlider.module.css';

// Recommended cover image dimensions for this slider section
const COVER_W = 1400;
const COVER_H = 460;

const slides = [
  { id: 1, slug: 'project-01', category: 'Instagram Pack', title: 'BKT SNEAKERS' },
  { id: 2, slug: 'project-02', category: 'Instagram Pack', title: 'ZIZO STUDIO' },
  { id: 3, slug: 'project-03', category: 'Logo Design',    title: 'BRAND MARK' },
  { id: 4, slug: 'project-04', category: 'Poster Design',  title: 'EVENT POSTER' },
];

/** Gray placeholder that shows the recommended cover dimensions */
function Placeholder({ dim = `${COVER_W} × ${COVER_H}` }: { dim?: string }) {
  return (
    <div className={styles.placeholder}>
      <span className={styles.placeholderDim}>{dim}</span>
    </div>
  );
}

export default function FeaturedSlider() {
  const [current, setCurrent] = useState(0);
  const [animDir, setAnimDir] = useState<null | 'left' | 'right'>(null);

  const go = (dir: 'left' | 'right') => {
    if (animDir !== null) return;
    setAnimDir(dir);
    setTimeout(() => {
      setCurrent(c =>
        dir === 'right'
          ? (c + 1) % slides.length
          : (c - 1 + slides.length) % slides.length
      );
      setAnimDir(null);
    }, 320);
  };

  const prevIdx = (current - 1 + slides.length) % slides.length;
  const nextIdx = (current + 1) % slides.length;

  return (
    <section className={styles.section} id="featured">
      <div
        className={`${styles.track} ${
          animDir === 'right' ? styles.shiftLeft :
          animDir === 'left'  ? styles.shiftRight : ''
        }`}
      >
        {/* ── Left peek — links to prev project ── */}
        <Link
          href={`/portfolio/${slides[prevIdx].slug}`}
          className={`${styles.peekCard} ${styles.peekLeft}`}
        >
          <Placeholder />
          <div className={styles.overlay} />
        </Link>

        {/* ── Main card — links to current project ── */}
        <Link href={`/portfolio/${slides[current].slug}`} className={styles.mainCard}>
          <Placeholder />
          <div className={styles.cardInfo}>
            <span className={styles.cardCat}>{slides[current].category}</span>
            <span className={styles.cardTitle}>{slides[current].title}</span>
          </div>
        </Link>

        {/* ── Right peek — links to next project ── */}
        <Link
          href={`/portfolio/${slides[nextIdx].slug}`}
          className={`${styles.peekCard} ${styles.peekRight}`}
        >
          <Placeholder />
          <div className={styles.overlay} />
        </Link>
      </div>

      {/* ── Arrow buttons ── */}
      <button
        className={`${styles.navBtn} ${styles.navLeft}`}
        onClick={() => go('left')}
        aria-label="Previous"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <button
        className={`${styles.navBtn} ${styles.navRight}`}
        onClick={() => go('right')}
        aria-label="Next"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </section>
  );
}
