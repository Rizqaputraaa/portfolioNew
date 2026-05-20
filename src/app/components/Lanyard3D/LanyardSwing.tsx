'use client';

import { useRef, useEffect } from 'react';
import Image from 'next/image';
import styles from './LanyardSwing.module.css';

export default function LanyardSwing() {
  const containerRef = useRef<HTMLDivElement>(null);
  const angleRef = useRef(0);
  const velRef = useRef(0);
  const isDragging = useRef(false);
  const lastXRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const GRAVITY = 0.0025;
    const DAMPING = 0.94;

    const loop = () => {
      if (!isDragging.current) {
        velRef.current = velRef.current * DAMPING - angleRef.current * GRAVITY;
        angleRef.current += velRef.current;
        // Clamp angle
        angleRef.current = Math.max(-0.35, Math.min(0.35, angleRef.current));
        el.style.transform = `rotate(${angleRef.current}rad)`;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    lastXRef.current = e.clientX;
    (e.target as Element).setPointerCapture(e.pointerId);
    document.body.style.cursor = 'grabbing';
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastXRef.current;
    lastXRef.current = e.clientX;
    velRef.current = dx * 0.006;
    angleRef.current += dx * 0.006;
    angleRef.current = Math.max(-0.5, Math.min(0.5, angleRef.current));
    if (containerRef.current) {
      containerRef.current.style.transform = `rotate(${angleRef.current}rad)`;
    }
  };

  const onPointerUp = () => {
    isDragging.current = false;
    document.body.style.cursor = 'auto';
  };

  return (
    <div className={styles.pivot}>
      <div
        ref={containerRef}
        className={styles.lanyard}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        style={{ cursor: 'grab' }}
      >
        <Image
          src="/lanyard/Lanyard-2.png"
          alt="Rizqaputra Lanyard"
          width={440}
          height={660}
          quality={95}
          priority
          draggable={false}
          className={styles.img}
        />
      </div>
    </div>
  );
}
