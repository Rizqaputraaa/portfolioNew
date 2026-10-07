'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './workspace.module.css';

interface Props {
  src: string;
  alt: string;
  className?: string;
  /** "fill": parent already sizes the image (thumbnails, covers). "flow": the image sizes itself (lightbox, viewer). */
  mode?: 'fill' | 'flow';
  onClick?: (e: React.MouseEvent<HTMLImageElement>) => void;
}

/**
 * Image that never shows an empty box while it loads: a shimmering placeholder with a spinner
 * stays until the bitmap is ready, then the image fades in. A failed load offers a retry.
 */
export default function SmartImage({ src, alt, className, mode = 'fill', onClick }: Props) {
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const ref = useRef<HTMLImageElement>(null);

  const url = attempt ? `${src}${src.includes('?') ? '&' : '?'}r=${attempt}` : src;

  useEffect(() => {
    setState('loading');
    // An already-cached image can finish before React attaches onLoad.
    const el = ref.current;
    if (el?.complete && el.naturalWidth > 0) setState('ok');
  }, [url]);

  const placeholder = state !== 'ok' && (
    <span className={styles.imgPlaceholder} role="status" aria-live="polite">
      {state === 'error' ? (
        <>
          <span>Gagal memuat</span>
          <button type="button" className={styles.imgRetry} onClick={() => { setAttempt(a => a + 1); }}>
            Coba lagi
          </button>
        </>
      ) : (
        <>
          <span className={`${styles.spinner} ${styles.spinnerLg}`} aria-hidden />
          <span className={styles.imgPlaceholderText}>Memuat gambar…</span>
        </>
      )}
    </span>
  );

  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={url}
      alt={alt}
      className={className}
      onClick={onClick}
      onLoad={() => setState('ok')}
      onError={() => setState('error')}
      style={{ opacity: state === 'ok' ? 1 : 0, transition: 'opacity 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}
    />
  );

  if (mode === 'flow') {
    return (
      <span className={`${styles.imgFlow} ${state !== 'ok' ? styles.imgFlowLoading : ''}`}>
        {placeholder}
        {img}
      </span>
    );
  }

  return (
    <>
      {placeholder}
      {img}
    </>
  );
}
