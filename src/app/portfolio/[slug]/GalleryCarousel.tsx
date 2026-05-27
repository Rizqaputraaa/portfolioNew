'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import ImageLightbox from '@/components/ImageLightbox/ImageLightbox';
import styles from './GalleryCarousel.module.css';

interface Props {
  images: string[];
  title: string;
}

export default function GalleryCarousel({ images, title }: Props) {
  const [idx, setIdx]   = useState(0);
  const [lb, setLb]     = useState<string | null>(null);
  const [cardW, setCardW] = useState(320);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragX    = useRef<number | null>(null);
  const dragged  = useRef(false);

  const GAP  = 20;
  const STEP = cardW + GAP;
  const n    = images.length;

  // Responsive: recalculate card width when container resizes
  useEffect(() => {
    const calc = () => {
      if (!stageRef.current) return;
      const w = stageRef.current.offsetWidth;
      // mobile (<640px): 72% of stage; desktop: 28% up to 360px
      const cw = w < 640
        ? Math.floor(w * 0.72)
        : Math.min(360, Math.floor(w * 0.28));
      setCardW(cw);
    };
    calc();
    const ro = new ResizeObserver(calc);
    if (stageRef.current) ro.observe(stageRef.current);
    return () => ro.disconnect();
  }, []);

  if (n === 0) return null;

  const prev = () => setIdx(i => (i - 1 + n) % n);
  const next = () => setIdx(i => (i + 1) % n);

  // Center card idx inside stage
  const translateX = `calc(50% - ${idx * STEP + Math.floor(cardW / 2)}px)`;

  const onDragStart = (x: number) => { dragX.current = x; dragged.current = false; };
  const onDragEnd   = (x: number) => {
    if (dragX.current === null) return;
    const d = dragX.current - x;
    if (Math.abs(d) > 40) { dragged.current = true; d > 0 ? next() : prev(); }
    dragX.current = null;
  };

  return (
    <>
      <section className={styles.section}>
        {/* Header */}
        <div className={styles.header}>
          <span className={styles.label}>GALLERY</span>
          <span className={styles.counter}>{idx + 1} / {n}</span>
        </div>

        {/* Stage */}
        <div
          ref={stageRef}
          className={styles.stage}
          onMouseDown={e => onDragStart(e.clientX)}
          onMouseUp={e => onDragEnd(e.clientX)}
          onMouseLeave={() => { dragX.current = null; }}
          onTouchStart={e => onDragStart(e.touches[0].clientX)}
          onTouchEnd={e => onDragEnd(e.changedTouches[0].clientX)}
        >
          {/* Track */}
          <div
            className={styles.track}
            style={{ transform: `translateX(${translateX})` }}
          >
            {images.map((src, i) => {
              const offset  = i - idx;
              const active  = offset === 0;
              return (
                <div
                  key={i}
                  className={`${styles.card} ${active ? styles.cardActive : ''}`}
                  style={{ width: cardW, height: cardW }}
                  onClick={() => {
                    if (dragged.current) return;
                    if (active) setLb(src);
                    else offset < 0 ? prev() : next();
                  }}
                >
                  <Image
                    src={src}
                    alt={`${title} gallery ${i + 1}`}
                    fill
                    className={styles.img}
                    sizes="(max-width: 640px) 72vw, 33vw"
                    draggable={false}
                  />
                  {active && (
                    <div className={styles.zoomHint}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"/>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        <line x1="11" y1="8" x2="11" y2="14"/>
                        <line x1="8" y1="11" x2="14" y2="11"/>
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Prev / Next */}
          {n > 1 && (
            <>
              <button className={`${styles.btn} ${styles.btnPrev}`} onClick={prev} aria-label="Previous">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </button>
              <button className={`${styles.btn} ${styles.btnNext}`} onClick={next} aria-label="Next">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Dots */}
        {n > 1 && (
          <div className={styles.dots}>
            {images.map((_, i) => (
              <button
                key={i}
                className={`${styles.dot} ${i === idx ? styles.dotActive : ''}`}
                onClick={() => setIdx(i)}
                aria-label={`Gallery image ${i + 1}`}
              />
            ))}
          </div>
        )}
      </section>

      {lb && (
        <ImageLightbox src={lb} alt={`${title} gallery`} onClose={() => setLb(null)} />
      )}
    </>
  );
}
