'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './FeaturedSlider.module.css';

const COVER_W = 1400;
const COVER_H = 460;

export interface SlideItem {
  id: string;
  slug: string;
  category: string;
  title: string;
  thumbnail?: string | null;
}

interface FeaturedSliderProps {
  slides?: SlideItem[];
}

function Placeholder({ dim = `${COVER_W} × ${COVER_H}` }: { dim?: string }) {
  return (
    <div className={styles.placeholder}>
      <span className={styles.placeholderDim}>{dim}</span>
    </div>
  );
}

export default function FeaturedSlider({ slides = [] }: FeaturedSliderProps) {
  const [current, setCurrent] = useState(0);
  const [animDir, setAnimDir] = useState<null | 'left' | 'right'>(null);

  if (slides.length === 0) return null;

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

  const CardImage = ({ slide }: { slide: SlideItem }) => (
    slide.thumbnail
      ? <Image src={slide.thumbnail} alt={slide.title} fill style={{ objectFit: 'cover' }} sizes="(max-width: 768px) 100vw, 1400px" unoptimized />
      : <Placeholder />
  );

  return (
    <section className={styles.section} id="featured">
      <div
        className={`${styles.track} ${
          animDir === 'right' ? styles.shiftLeft :
          animDir === 'left'  ? styles.shiftRight : ''
        }`}
      >
        {/* ── Left peek ── */}
        <Link href={`/portfolio/${slides[prevIdx].slug}`} className={`${styles.peekCard} ${styles.peekLeft}`}>
          <CardImage slide={slides[prevIdx]} />
          <div className={styles.overlay} />
        </Link>

        {/* ── Main card ── */}
        <Link href={`/portfolio/${slides[current].slug}`} className={styles.mainCard}>
          <CardImage slide={slides[current]} />
          <div className={styles.cardInfo}>
            <span className={styles.cardCat}>{slides[current].category}</span>
            <span className={styles.cardTitle}>{slides[current].title.toUpperCase()}</span>
          </div>
        </Link>

        {/* ── Right peek ── */}
        <Link href={`/portfolio/${slides[nextIdx].slug}`} className={`${styles.peekCard} ${styles.peekRight}`}>
          <CardImage slide={slides[nextIdx]} />
          <div className={styles.overlay} />
        </Link>
      </div>

      <button className={`${styles.navBtn} ${styles.navLeft}`} onClick={() => go('left')} aria-label="Previous">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <button className={`${styles.navBtn} ${styles.navRight}`} onClick={() => go('right')} aria-label="Next">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </section>
  );
}
