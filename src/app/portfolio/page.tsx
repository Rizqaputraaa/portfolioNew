'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { isNewItem } from '@/lib/utils';
import styles from './page.module.css';

interface TabItem { label: string; value: string; }

const ALL_TAB: TabItem = { label: 'ALL', value: 'all' };

interface ProjectItem {
  id: string; slug: string; title: string; category: string;
  thumbnail: string | null; created_at: string;
}

const PLACEHOLDER_PROJECTS: ProjectItem[] = Array.from({ length: 9 }, (_, i) => ({
  id: `p${i + 1}`, slug: `project-0${i + 1}`,
  title: `Project ${String(i + 1).padStart(2, '0')}`,
  category: ['insta_pack', 'logo', 'poster', 'printing', 'ui_design'][i % 5],
  thumbnail: null, created_at: new Date().toISOString(),
}));

const PER_PAGE = 9;

function PortfolioInner() {
  const searchParams = useSearchParams();
  const initCat = searchParams.get('cat') ?? 'all';

  const [cat, setCat]       = useState<string>(initCat);
  const [tabs, setTabs]     = useState<TabItem[]>([ALL_TAB]);
  const [page, setPage]     = useState(1);
  const [items, setItems]   = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [animKey, setAnimKey] = useState(0);
  const mounted = useRef(false);

  // Fetch kategori dari DB untuk tab filter
  useEffect(() => {
    fetch('/api/categories')
      .then(r => r.ok ? r.json() : [])
      .then((data: { label: string; value: string }[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setTabs([ALL_TAB, ...data.map(c => ({ label: c.label.toUpperCase(), value: c.value }))]);
        }
      })
      .catch(() => {});
  }, []);

  // Sync URL cat param → tab on navigation from footer links
  useEffect(() => {
    const urlCat = searchParams.get('cat') ?? 'all';
    if (urlCat !== cat) setCat(urlCat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (!mounted.current) { mounted.current = true; }
    setPage(1);
    setAnimKey(k => k + 1);
    setLoading(true);
    fetch(`/api/projects${cat !== 'all' ? `?category=${cat}` : ''}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (Array.isArray(data)) setItems(data);
        else setItems([]);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [cat]);

  // API sudah filter by category server-side (pakai categories array),
  // jadi tidak perlu filter ulang di sini
  const totalPages = Math.ceil(items.length / PER_PAGE);
  const visible    = items.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className={styles.page}>
      {/* ── Hero ── */}
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>WORK</h1>
        <p className={styles.heroSub}>I&apos;ve completed</p>
      </section>

      {/* ── Category tabs ── */}
      <div className={styles.tabs}>
        {tabs.map(t => (
          <button
            key={t.value}
            className={`${styles.tab} ${cat === t.value ? styles.tabActive : ''}`}
            onClick={() => setCat(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Content area (grows to fill) ── */}
      <div className={styles.contentArea}>
        <div key={animKey} className={styles.grid}>
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={styles.skeletonCard}>
                  <div className={styles.skeletonThumb} />
                  <div className={styles.skeletonInfo}>
                    <div className={styles.skeletonLine} />
                  </div>
                </div>
              ))
            : visible.map(p => (
                <Link key={p.id} href={`/portfolio/${p.slug}`} className={styles.card}>
                  <div className={styles.thumb}>
                    {p.thumbnail ? (
                      <Image src={p.thumbnail} alt={p.title} fill className={styles.thumbImg} sizes="(max-width: 768px) 50vw, 33vw" />
                    ) : (
                      <span className={styles.thumbPlaceholder}>356px × 254px</span>
                    )}
                  </div>
                  <div className={styles.cardInfo}>
                    <span className={styles.cardName}>{p.title}</span>
                    {isNewItem(p.created_at) && <span className={styles.badgeNew}>NEW</span>}
                  </div>
                </Link>
              ))
          }
        </div>

        {/* ── Pagination ── */}
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

      {/* ── CTA ── */}
      <section className={styles.ctaStrip}>
        <div className={styles.ctaInner}>
          <div className={styles.ctaText}>
            <h3>WORK WITH ME ?</h3>
            <p>Hit with email or DM Instagram</p>
          </div>
          <div className={styles.ctaActions}>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className={styles.ctaBtnDm}>DM</a>
            <a href="mailto:hello@rizqaputra.com" className={styles.ctaBtnEmail}>EMAIL</a>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function PortfolioPage() {
  return (
    <Suspense>
      <PortfolioInner />
    </Suspense>
  );
}
