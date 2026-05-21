'use client';

import { useState } from 'react';
import Image from 'next/image';
import styles from './page.module.css';

// Recommended cover dimensions for source detail
const COVER_W = 1920;
const COVER_H = 800;
const PLACEHOLDER_COUNT = 5;

interface Props {
  images: string[];
  title: string;
}

export default function CoverSlider({ images, title }: Props) {
  const [current, setCurrent] = useState(0);

  const isEmpty = images.length === 0;
  const total = isEmpty ? PLACEHOLDER_COUNT : images.length;

  const prev = () => setCurrent(i => (i - 1 + total) % total);
  const next = () => setCurrent(i => (i + 1) % total);

  return (
    <div className={styles.slider}>
      {/* Slides */}
      <div className={styles.sliderTrack}>
        {isEmpty
          ? Array.from({ length: PLACEHOLDER_COUNT }).map((_, idx) => (
              <div
                key={idx}
                className={`${styles.slide} ${idx === current ? styles.slideActive : ''}`}
              >
                <div className={styles.coverPlaceholder}>
                  <span className={styles.coverPlaceholderDim}>{COVER_W} × {COVER_H}</span>
                </div>
              </div>
            ))
          : images.map((src, idx) => (
              <div
                key={idx}
                className={`${styles.slide} ${idx === current ? styles.slideActive : ''}`}
              >
                <Image
                  src={src}
                  alt={`${title} cover ${idx + 1}`}
                  fill
                  priority={idx === 0}
                  className={styles.slideImg}
                  sizes="100vw"
                />
              </div>
            ))
        }
      </div>

      {/* Controls — always show when multiple slides */}
      {total > 1 && (
        <>
          <button
            className={`${styles.sliderBtn} ${styles.sliderBtnPrev}`}
            onClick={prev}
            aria-label="Previous"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            className={`${styles.sliderBtn} ${styles.sliderBtnNext}`}
            onClick={next}
            aria-label="Next"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {/* Dots */}
          <div className={styles.dots}>
            {Array.from({ length: total }).map((_, idx) => (
              <button
                key={idx}
                className={`${styles.dot} ${idx === current ? styles.dotActive : ''}`}
                onClick={() => setCurrent(idx)}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          {/* Counter */}
          <div className={styles.counter}>{current + 1} / {total}</div>
        </>
      )}
    </div>
  );
}
