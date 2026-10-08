'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '../useAdminAuth';
import { useAdminCall } from './useAdminCall';
import { WORKSPACE_CHANGED } from './nav';
import styles from './workspaces.module.css';

interface ProjectCard {
  id: string;
  slug: string;
  name: string;
  client_name: string | null;
  instagram: string | null;
  pack_number: number;
  target_feeds: number;
  month_label: string | null;
  danta_enabled: boolean;
  client_enabled: boolean;
  counts: Record<string, number>;
  done: number;
}

interface Overview {
  projects: ProjectCard[];
  summary: { needsWork: number; needsReview: number; done: number; target: number; projects: number };
  todos: { open: number; top: { id: string; text: string; priority: string }[] };
}

const AVATAR_COLORS = ['#D5631A', '#7A5AF8', '#2E90FA', '#12B76A', '#E5534B', '#C4981F', '#DB4F9E'];
const avatarColor = (key: string) => {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

/** The workspace home: summary cards and one card per client pack. The frame (rail, header) comes from WorkspaceShell. */
export default function WorkspaceDashboard() {
  const { supabase } = useAdminAuth();
  const call = useAdminCall();
  const router = useRouter();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all');
  const [opening, setOpening] = useState('');

  const load = useCallback(async () => {
    try {
      setData(await call<Overview>('/api/admin/ws/overview'));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, [call]);

  useEffect(() => {
    if (supabase) load();
  }, [supabase, load]);

  // New client / new todo from the header: refresh the cards.
  useEffect(() => {
    window.addEventListener(WORKSPACE_CHANGED, load);
    return () => window.removeEventListener(WORKSPACE_CHANGED, load);
  }, [load]);

  const open = async (slug: string) => {
    setOpening(slug);
    try {
      const { url } = await call<{ url: string }>('/api/admin/ws/open', { method: 'POST', body: JSON.stringify({ slug }) });
      router.push(url);
    } catch (e) {
      setError((e as Error).message);
      setOpening('');
    }
  };

  const projects = useMemo(() => {
    const list = data?.projects ?? [];
    if (filter === 'active') return list.filter(p => p.done < p.target_feeds);
    if (filter === 'done') return list.filter(p => p.target_feeds > 0 && p.done >= p.target_feeds);
    return list;
  }, [data, filter]);

  const s = data?.summary;
  const pct = s && s.target ? Math.round((s.done / s.target) * 100) : 0;

  return (
    <>
      {error && <div className={styles.error} role="alert" style={{ marginBottom: 16 }}>{error}</div>}

      {!data && !error && <div className={styles.loading}><span className={styles.spinner} /> Memuat workspace…</div>}

      {data && s && (
        <>
          <section className={styles.info} aria-label="Ringkasan">
            <article className={`${styles.infoCard} ${styles.infoHot}`}>
              <span className={styles.infoLabel}>Perlu kamu kerjakan</span>
              <span className={styles.infoNumber}>{s.needsWork}</span>
              <span className={styles.infoSub}>
                feed di tahap desain atau revisi{s.needsReview > 0 ? ` · ${s.needsReview} menunggu review Danta` : ''}
              </span>
            </article>

            <article className={styles.infoCard}>
              <span className={styles.infoLabel}>Progres pack</span>
              <span className={styles.infoNumber}>{s.done}<small> / {s.target}</small></span>
              <div className={styles.infoBar} aria-label={`${pct}% feed selesai`}><span style={{ width: `${pct}%` }} /></div>
              <span className={styles.infoSub} style={{ color: 'var(--gray)' }}>
                feed disetujui dari {s.projects} client
              </span>
            </article>

            <article className={styles.infoCard}>
              <span className={styles.infoLabel}>ToDo aktif</span>
              <span className={styles.infoNumber}>{data.todos.open}</span>
              {data.todos.top.length > 0 && (
                <ul className={styles.infoList}>{data.todos.top.map(t => <li key={t.id}>• {t.text}</li>)}</ul>
              )}
              <Link href="/admin/todos" className={styles.infoLink}>Buka semua ToDo →</Link>
            </article>
          </section>

          <section aria-label="Client">
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>Client <span className={styles.count}>{data.projects.length}</span></h2>
              <div className={styles.chips} role="tablist" aria-label="Filter client">
                {([['all', 'Semua'], ['active', 'Berjalan'], ['done', 'Selesai']] as const).map(([v, label]) => (
                  <button
                    key={v}
                    role="tab"
                    aria-selected={filter === v}
                    className={`${styles.chip} ${filter === v ? styles.chipOn : ''}`}
                    onClick={() => setFilter(v)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.clients}>
              {projects.length === 0 && (
                <div className={styles.empty}>
                  {data.projects.length === 0 ? 'Belum ada client. Tekan "+ Client" untuk menambah.' : 'Tidak ada client di filter ini.'}
                </div>
              )}
              {projects.map((p, i) => {
                const name = p.client_name || p.name;
                const pctDone = p.target_feeds ? Math.round((p.done / p.target_feeds) * 100) : 0;
                const c = p.counts;
                return (
                  <article key={p.id} className={styles.card} style={{ '--i': i } as React.CSSProperties}>
                    <div className={styles.notch} aria-hidden />
                    <button className={styles.go} onClick={() => open(p.slug)} disabled={opening === p.slug}
                      aria-label={`Buka workspace ${name}`}>
                      {opening === p.slug
                        ? <span className={styles.spinner} />
                        : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7" /><path d="M8 7h9v9" /></svg>}
                    </button>

                    <div className={styles.who}>
                      <span className={styles.avatar} style={{ background: avatarColor(p.slug) }} aria-hidden>
                        {name.trim().charAt(0).toUpperCase()}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div className={styles.username}>{p.instagram ? `@${p.instagram}` : name}</div>
                        <div className={styles.sub}>{p.instagram ? name : 'Instagram belum diisi'}</div>
                      </div>
                    </div>

                    <div>
                      <div className={styles.pack}>Pack-{p.pack_number}</div>
                      <div className={styles.range}>
                        <span><b>Feed 1</b></span><span>→</span><span><b>Feed {p.target_feeds}</b></span>
                        {p.month_label && <span>· {p.month_label}</span>}
                      </div>
                    </div>

                    <div className={styles.stats}>
                      <span><b>{p.done}</b> selesai</span>
                      {(c.design ?? 0) + (c.revision ?? 0) > 0 && <span><b>{(c.design ?? 0) + (c.revision ?? 0)}</b> dikerjakan</span>}
                      {(c.review ?? 0) > 0 && <span><b>{c.review}</b> review</span>}
                      {(c.brief ?? 0) + (c.brief_review ?? 0) > 0 && <span><b>{(c.brief ?? 0) + (c.brief_review ?? 0)}</b> brief</span>}
                    </div>

                    <div className={`${styles.progress} ${pctDone >= 100 ? styles.progressDone : ''}`}>
                      <span style={{ width: `${pctDone}%` }} />
                    </div>

                    <div className={styles.tags}>
                      <span className={`${styles.tag} ${p.danta_enabled ? '' : styles.tagMuted}`}>{p.danta_enabled ? 'Danta' : 'Tanpa Danta'}</span>
                      {p.client_enabled && <span className={styles.tag}>Client login</span>}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </>
      )}
    </>
  );
}
