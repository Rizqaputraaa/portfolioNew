'use client';

import dynamic from 'next/dynamic';
import styles from './page.module.css';

// Lazy-load WebGL component (no SSR)
const PixelBlast = dynamic(() => import('@/components/PixelBlast/PixelBlast'), { ssr: false });

export default function BioBanner() {
  return (
    <div className={styles.bioCard}>
      {/* Pixel blast background */}
      <div className={styles.pixelBg} aria-hidden="true">
        <PixelBlast
          color="#484848"
          pixelSize={3}
          speed={0.25}
          patternDensity={0.85}
          patternScale={1.8}
          edgeFade={0.1}
          transparent={true}
          enableRipples={false}
        />
      </div>

      {/* Bio text */}
      <div className={styles.bioText}>
        <p>
          <strong>I&apos;M RIZQAPUTRA</strong>, <em>the designer caught between disciplines.
          Since discovering my identity crisis, I&apos;ve been building bold creative assets
          inspired by the collision of design, code, and art. I refuse to pick just one lane.
          My way of turning creative confusion into work that actually matters— work that feels
          real, experimental, and unapologetically alive.</em>
        </p>
      </div>
    </div>
  );
}
