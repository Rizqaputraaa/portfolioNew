'use client';

import { useState } from 'react';
import Image from 'next/image';
import styles from './FeaturedSlider.module.css';

const slides = [
  { id: 1, category: 'Instagram Pack', title: 'BKT SNEAKERS', image: '/lanyard/Lanyard-2.png' },
  { id: 2, category: 'Instagram Pack', title: 'ZIZO STUDIO',  image: '/lanyard/Lanyard-1.png' },
  { id: 3, category: 'Logo Design',    title: 'BRAND MARK',  image: '/lanyard/Lanyard-2.png' },
  { id: 4, category: 'Poster Design',  title: 'EVENT POSTER', image: '/lanyard/Lanyard-1.png' },
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

  return (
    <section className={styles.section} id="featured">
      {/* 3-column peek layout */}
      <div className={`${styles.track} ${animDir ? (animDir === 'right' ? styles.shiftLeft : styles.shiftRight) : ''}`}>
        {/* Left peek */}
        <div className={`${styles.peekCard} ${styles.peekLeft}`} onClick={() => go('left')}>
          <Image src={slides[prev].image} alt="" fill style={{ objectFit: 'cover' }} />
          <div className={styles.overlay} />
        </div>

        {/* Main card */}
        <div className={styles.mainCard}>
          <Image src={slides[current].image} alt={slides[current].title} fill style={{ objectFit: 'cover' }} priority />
          <div className={styles.cardInfo}>
            <span className={styles.cardCat}>{slides[current].category}</span>
            <span className={styles.cardTitle}>{slides[current].title}</span>
          </div>
        </div>

        {/* Right peek */}
        <div className={`${styles.peekCard} ${styles.peekRight}`} onClick={() => go('right')}>
          <Image src={slides[next].image} alt="" fill style={{ objectFit: 'cover' }} />
          <div className={styles.overlay} />
        </div>
      </div>

      {/* Nav buttons — positioned at left/right edges of main card */}
      <button
        className={`${styles.navBtn} ${styles.navLeft}`}
        onClick={() => go('left')}
        aria-label="Previous"
      >
        <Image src="/icons/previous.png" alt="prev" width={44} height={44} />
      </button>
      <button
        className={`${styles.navBtn} ${styles.navRight}`}
        onClick={() => go('right')}
        aria-label="Next"
      >
        <Image
          src="/icons/previous.png"
          alt="next"
          width={44}
          height={44}
          style={{ transform: 'scaleX(-1)' }}
        />
      </button>
    </section>
  );
}
