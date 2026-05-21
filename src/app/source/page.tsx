'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import styles from './page.module.css';

type Category = 'all' | 'mockup' | 'overlay_texture' | 'script' | 'psd_effect';

const TABS: { label: string; value: Category }[] = [
  { label: 'ALL',               value: 'all' },
  { label: 'MOCKUP',            value: 'mockup' },
  { label: 'OVERLAY & TEXTURE', value: 'overlay_texture' },
  { label: 'SCRIPT',            value: 'script' },
  { label: 'PSD EFFECT',        value: 'psd_effect' },
];

interface SourceItem {
  id: string; slug: string; title: string; category: string;
  thumbnail: string | null; is_new?: boolean;
}

const PLACEHOLDER_SOURCES: SourceItem[] = Array.from({ length: 9 }, (_, i) => ({
  id: `s${i + 1}`, slug: `source-0${i + 1}`,
  title: `Source ${String(i + 1).padStart(2, '0')}`,
  category: ['mockup', 'overlay_texture', 'script', 'psd_effect'][i % 4],
  thumbnail: null, is_new: i === 0,
}));

const PER_PAGE = 9;

function SourceInner() {
  const searchParams = useSearchParams();
  const initCat = (searchParams.get('cat') ?? 'all') as Category;

  const [cat, setCat]         = useState<Category>(initCat);
  const [page, setPage]       = useState(1);
  const [items, setItems]     = useState<SourceItem[]>(PLACEHOLDER_SOURCES);
  const [email, setEmail]     = useState('');
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const mounted = useRef(false);

  useEffect(() => {
    const urlCat = (searchParams.get('cat') ?? 'all') as Category;
    if (urlCat !== cat) setCat(urlCat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    setPage(1);
    setAnimKey(k => k + 1);
    setLoading(true);
    fetch(`/api/sources${cat !== 'all' ? `?category=${cat}` : ''}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && Array.isArray(data) && data.length > 0) setItems(data);
        else setItems(PLACEHOLDER_SOURCES);
      })
      .catch(() => setItems(PLACEHOLDER_SOURCES))
      .finally(() => setLoading(false));
  }, [cat]);

  const filtered   = cat === 'all' ? items : items.filter(s => s.category === cat);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const visible    = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSent(true); setEmail('');
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <div className={styles.page}>
      {/* ── Hero ── */}
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>SOURCE</h1>
        <p className={styles.heroSub}>
          Resources and design assets I&apos;ve created. Tools, mockups, and templates to speed up your creative process.
        </p>
      </section>

      {/* ── Category tabs ── */}
      <div className={styles.tabs}>
        {TABS.map(t => (
          <button
            key={t.value}
            className={`${styles.tab} ${cat === t.value ? styles.tabActive : ''}`}
            onClick={() => setCat(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Content area ── */}
      <div className={styles.contentArea}>
        <div key={animKey} className={`${styles.grid} ${loading ? styles.gridLoading : ''}`}>
          {visible.map(s => (
            <Link key={s.id} href={`/source/${s.slug}`} className={styles.card}>
              <div className={styles.thumb}>
                {s.thumbnail ? (
                  <Image src={s.thumbnail} alt={s.title} fill className={styles.thumbImg} sizes="(max-width: 768px) 50vw, 33vw" />
                ) : (
                  <span className={styles.thumbPlaceholder}>356px × 254px</span>
                )}
              </div>
              <div className={styles.cardInfo}>
                <span className={styles.cardName}>{s.title}</span>
                {s.is_new && <span className={styles.badgeNew}>NEW</span>}
              </div>
            </Link>
          ))}
        </div>

        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button className={styles.pageBtn} disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>←</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button key={n} className={`${styles.pageBtn} ${n === page ? styles.pageBtnActive : ''}`} onClick={() => setPage(n)}>{n}</button>
            ))}
            <button className={styles.pageBtn} disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>→</button>
          </div>
        )}
      </div>

      {/* ── Subscribe strip ── */}
      <section className={styles.ctaStrip}>
        <div className={styles.ctaInner}>
          <div className={styles.ctaText}>
            <h3>JOIN THE CLUB</h3>
            <p>No spam ever. Only useful information.</p>
          </div>
          <form className={styles.form} onSubmit={handleSubscribe}>
            <input type="email" className={styles.input} placeholder={sent ? '✓ Subscribed!' : 'Your email address'} value={email} onChange={e => setEmail(e.target.value)} required />
            <button type="submit" className={styles.btn}>{sent ? 'DONE!' : 'SUBSCRIBE'}</button>
          </form>
        </div>
      </section>
    </div>
  );
}

export default function SourcePage() {
  return (
    <Suspense>
      <SourceInner />
    </Suspense>
  );
}
