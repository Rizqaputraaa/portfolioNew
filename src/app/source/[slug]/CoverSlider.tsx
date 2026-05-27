'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import ImageLightbox from '@/components/ImageLightbox/ImageLightbox';
import styles from './page.module.css';

const COVER_W = 1920;
const COVER_H = 800;
const PLACEHOLDER_COUNT = 5;

interface Props {
  images: string[];
  title: string;
}

export default function CoverSlider({ images, title }: Props) {
  const [current, setCurrent]       = useState(0);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const dragStartX = useRef<number | null>(null);
  const didDrag    = useRef(false);

  const isEmpty = images.length === 0;
  const total   = isEmpty ? PLACEHOLDER_COUNT : images.length;

  const prev = () => setCurrent(i => (i - 1 + total) % total);
  const next = () => setCurrent(i => (i + 1) % total);

  const handleDragStart = (x: number) => { dragStartX.current = x; didDrag.current = false; };
  const handleDragEnd   = (x: number) => {
    if (dragStartX.current === null) return;
    const diff = dragStartX.current - x;
    if (Math.abs(diff) > 50) { didDrag.current = true; diff > 0 ? next() : prev(); }
    dragStartX.current = null;
  };

  const handleImageClick = (src: string) => {
    if (!didDrag.current) setLightboxSrc(src);
  };

  return (
    <>
      <div
        className={styles.slider}
        onTouchStart={e => handleDragStart(e.touches[0].clientX)}
        onTouchEnd={e => handleDragEnd(e.changedTouches[0].clientX)}
        onMouseDown={e => handleDragStart(e.clientX)}
        onMouseUp={e => handleDragEnd(e.clientX)}
        style={{ cursor: total > 1 ? 'grab' : 'zoom-in' }}
      >
        <div className={styles.sliderTrack}>
          {isEmpty
            ? Array.from({ length: PLACEHOLDER_COUNT }).map((_, idx) => (
                <div key={idx} className={`${styles.slide} ${idx === current ? styles.slideActive : ''}`}>
                  <div className={styles.coverPlaceholder}>
                    <span className={styles.coverPlaceholderDim}>{COVER_W} × {COVER_H}</span>
                  </div>
                </div>
              ))
            : images.map((src, idx) => (
                <div
                  key={idx}
                  className={`${styles.slide} ${idx === current ? styles.slideActive : ''}`}
                  onClick={() => idx === current && handleImageClick(src)}
                  style={{ cursor: idx === current ? 'zoom-in' : 'default' }}
                >
                  <Image
                    src={src}
                    alt={`${title} cover ${idx + 1}`}
                    fill
                    priority={idx === 0}
                    className={styles.slideImg}
                    sizes="100vw"
                  />
                  {idx === current && (
                    <div className={styles.coverZoomHint}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
                      </svg>
                    </div>
                  )}
                </div>
              ))
          }
        </div>

        {total > 1 && (
          <>
            <button className={`${styles.sliderBtn} ${styles.sliderBtnPrev}`}
              onClick={e => { e.stopPropagation(); prev(); }} aria-label="Previous">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <button className={`${styles.sliderBtn} ${styles.sliderBtnNext}`}
              onClick={e => { e.stopPropagation(); next(); }} aria-label="Next">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
            <div className={styles.dots}>
              {Array.from({ length: total }).map((_, idx) => (
                <button key={idx}
                  className={`${styles.dot} ${idx === current ? styles.dotActive : ''}`}
                  onClick={e => { e.stopPropagation(); setCurrent(idx); }}
                  aria-label={`Go to slide ${idx + 1}`} />
              ))}
            </div>
            <div className={styles.counter}>{current + 1} / {total}</div>
          </>
        )}
      </div>

      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} alt={`${title} cover`} onClose={() => setLightboxSrc(null)} />
      )}
    </>
  );
}
