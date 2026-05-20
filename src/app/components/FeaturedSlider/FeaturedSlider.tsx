'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './FeaturedSlider.module.css';

const slides = [
  {
    id: 1,
    slug: 'project-01',
    category: 'Instagram Pack',
    title: 'BKT SNEAKERS',
    image: '/lanyard/Lanyard-2.png',
  },
  {
    id: 2,
    slug: 'project-02',
    category: 'Instagram Pack',
    title: 'ZIZO STUDIO',
    image: '/lanyard/Lanyard-1.png',
  },
  {
    id: 3,
    slug: 'project-03',
    category: 'Logo Design',
    title: 'BRAND MARK',
    image: '/lanyard/Lanyard-2.png',
  },
  {
    id: 4,
    slug: 'project-04',
    category: 'Poster Design',
    title: 'EVENT POSTER',
    image: '/lanyard/Lanyard-1.png',
  },
];

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

  const prev = (current - 1 + slides.length) % slides.length;
  const next = (current + 1) % slides.length;
  const slide = slides[current];

  return (
    <section className={styles.section} id="featured">
      <div
        className={`${styles.track} ${
          animDir === 'right' ? styles.shiftLeft :
          animDir === 'left'  ? styles.shiftRight : ''
        }`}
      >
        {/* Left peek — click navigates */}
        <div
          className={`${styles.peekCard} ${styles.peekLeft}`}
          onClick={() => go('left')}
          role="button"
          aria-label="Previous project"
        >
          <Image src={slides[prev].image} alt="" fill style={{ objectFit: 'cover' }} />
          <div className={styles.overlay} />
        </div>

        {/* Main card — clicking opens the project detail */}
        <Link href={`/portfolio/${slide.slug}`} className={styles.mainCard}>
          <Image
            src={slide.image}
            alt={slide.title}
            fill
            style={{ objectFit: 'cover' }}
            priority
          />
          <div className={styles.cardInfo}>
            <span className={styles.cardCat}>{slide.category}</span>
            <span className={styles.cardTitle}>{slide.title}</span>
          </div>
        </Link>

        {/* Right peek — click navigates */}
        <div
          className={`${styles.peekCard} ${styles.peekRight}`}
          onClick={() => go('right')}
          role="button"
          aria-label="Next project"
        >
          <Image src={slides[next].image} alt="" fill style={{ objectFit: 'cover' }} />
          <div className={styles.overlay} />
        </div>
      </div>

      {/* ── Left arrow button ── */}
      <button
        className={`${styles.navBtn} ${styles.navLeft}`}
        onClick={() => go('left')}
        aria-label="Previous"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {/* ── Right arrow button ── */}
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
