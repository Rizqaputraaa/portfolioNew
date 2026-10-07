'use client';

import { useCallback, useEffect, useRef, useState, FormEvent } from 'react';
import { useParams } from 'next/navigation';
import { api, ApiError, fileUrl } from './api';
import FeedSheet from './FeedSheet';
import {
  ROLE_LABEL, STATUS_LABEL, STATUS_ORDER,
  type FeedSummary, type ProjectInfo, type Role,
} from '@/lib/workspace/types';
import styles from './workspace.module.css';

interface Overview {
  project: ProjectInfo;
  me: { role: Role; name: string };
  feeds: FeedSummary[];
}

const SEG_COLOR: Record<string, string> = {
  brief: '#6F6F6F', brief_review: '#6E6CE6', design: '#3A8FE8', review: '#E0AE3C',
  revision: '#E5534B', approved: '#34C759', posted: '#A569E8',
};

export default function WorkspacePage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setData(await api<Overview>(slug, '/feeds'));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setData(null);
      else setError((e as Error).message);
    }
    setLoading(false);
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  // Pick up other people's changes without a manual reload (only while the tab is visible).
  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') load(); };
    const id = setInterval(tick, 30_000);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick); };
  }, [load]);

  // Share links look like /workspace/padel?feed=3 — open that feed once the user is signed in.
  const [deepLink, setDeepLink] = useState<number | null>(null);
  useEffect(() => {
    const n = Number(new URLSearchParams(window.location.search).get('feed'));
    if (n > 0) setDeepLink(n);
  }, []);
  useEffect(() => {
    if (data && deepLink) { setOpen(deepLink); setDeepLink(null); }
  }, [data, deepLink]);

  const logout = async () => {
    await api(slug, '/login', { method: 'DELETE' });
    setData(null);
    setOpen(null);
  };

  // Tapping an empty slot creates the feed right away and opens its form; the title is edited there.
  const createFeed = async () => {
    if (creating) return;
    setCreating(true);
    setError('');
    try {
      const { number } = await api<{ number: number }>(slug, '/feeds', { method: 'POST', json: {} });
      await load();
      setOpen(number);
    } catch (err) {
      setError((err as Error).message);
    }
    setCreating(false);
  };

  if (loading) return <div className={styles.root} />;
  if (!data) return <Login slug={slug} onDone={load} />;

  const { project, me, feeds } = data;
  const byNumber = new Map(feeds.map(f => [f.number, f]));
  const target = project.target_feeds;
  const count = (s: string) => feeds.filter(f => f.status === s).length;
  const done = count('approved') + count('posted');
  const unreadCount = feeds.filter(f => f.unread).length;
  const canCreate = me.role !== 'designer';
  const nextNumber = feeds.length ? Math.max(...feeds.map(f => f.number)) + 1 : 1;

  return (
    <div className={styles.root}>
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <div>
            <h1 className={styles.title}>{project.name}</h1>
            <p className={`${styles.muted} ${styles.small}`} style={{ margin: '2px 0 0' }}>
              {project.month_label ?? 'Workspace'} · {target} feed
            </p>
          </div>
          <div className={styles.who}>
            <span className={styles.rolePill}>{ROLE_LABEL[me.role]}</span>
            <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={logout}>
              Keluar
            </button>
          </div>
        </header>

        <section className={styles.progressCard} aria-label="Progress">
          <div className={styles.progressTop}>
            <div>
              <span className={styles.bigNumber}>{done}</span>
              <span className={styles.muted}> / {target} feed disetujui</span>
            </div>
            <span className={`${styles.muted} ${styles.small}`}>
              {unreadCount > 0 && <span className={styles.newPill}>{unreadCount} baru</span>}{' '}
              {count('posted')} sudah diposting
            </span>
          </div>
          <div className={styles.bar} role="img" aria-label={`${done} dari ${target} feed disetujui`}>
            {STATUS_ORDER.map(s => count(s) > 0 && (
              <div key={s} className={styles.barSeg} style={{ flex: count(s), background: SEG_COLOR[s] }} />
            ))}
            {target - feeds.length > 0 && <div className={styles.barSeg} style={{ flex: target - feeds.length }} />}
          </div>
          <div className={styles.legend}>
            {STATUS_ORDER.map(s => (
              <span key={s} className={styles.legendItem}>
                <span className={styles.dot} style={{ background: SEG_COLOR[s] }} />
                {STATUS_LABEL[s]} {count(s)}
              </span>
            ))}
          </div>
        </section>

        {error && <div className={styles.error} role="alert" style={{ marginBottom: 16 }}>{error}</div>}

        <div className={styles.grid}>
          {Array.from({ length: target }, (_, i) => i + 1).map((n, idx) => {
            const stagger = { '--i': idx } as React.CSSProperties;
            const feed = byNumber.get(n);
            if (!feed) {
              const isNext = n === nextNumber && canCreate;
              return (
                <button
                  key={n}
                  className={`${styles.card} ${styles.cardEmpty}`}
                  disabled={!isNext || creating}
                  onClick={() => isNext && createFeed()}
                  aria-label={isNext ? `Buat brief feed ${n}` : `Feed ${n} kosong`}
                  style={{ ...stagger, ...(!isNext ? { cursor: 'default' } : {}) }}
                >
                  <span>Feed {n}</span>
                  {isNext && <span style={{ color: 'var(--accent-text)' }}>{creating ? 'Membuat…' : '+ Buat brief'}</span>}
                </button>
              );
            }
            return (
              <button key={n} className={styles.card} style={stagger} onClick={() => setOpen(n)}
                aria-label={`Feed ${n}${feed.unread ? ', ada yang baru' : ''}`}>
                {feed.unread && <span className={styles.newDot} aria-hidden />}
                {feed.cover_file_id && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className={styles.cardImg} src={fileUrl(slug, feed.cover_file_id)} alt="" loading="lazy" />
                )}
                <span className={styles.cardBody}>
                  <span>
                    <span className={styles.cardNum}>FEED {n}</span>
                    <br />
                    <span className={`${styles.chip} ${styles[`s_${feed.status}`]}`}>
                      {STATUS_LABEL[feed.status]}
                    </span>
                  </span>
                  <span className={styles.cardTitle}>{feed.title}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {open !== null && (
        <FeedSheet
          slug={slug}
          number={open}
          role={me.role}
          onClose={() => setOpen(null)}
          onChanged={load}
          onSeen={load}
        />
      )}
    </div>
  );
}

function Login({ slug, onDone }: { slug: string; onDone: () => void }) {
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const cardRef = useRef<HTMLFormElement>(null);

  // Re-trigger the shake each time, even for two wrong PINs in a row.
  const shake = () => {
    const el = cardRef.current;
    if (!el) return;
    el.classList.remove(styles.shake);
    void el.offsetWidth;
    el.classList.add(styles.shake);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api(slug, '/login', { method: 'POST', json: { pin } });
      setPin('');
      onDone();
    } catch (err) {
      setError((err as Error).message);
      shake();
    }
    setBusy(false);
  };

  return (
    <div className={styles.root}>
      <div className={styles.loginWrap}>
        <form ref={cardRef} className={styles.loginCard} onSubmit={submit}>
          <h1 className={styles.loginTitle}>Workspace</h1>
          <p className={`${styles.muted} ${styles.small}`} style={{ margin: '0 0 20px' }}>
            Masukkan PIN yang kamu terima.
          </p>

          <input
            className={`${styles.input} ${styles.pinInput}`}
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            placeholder="••••"
            aria-label="PIN"
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
            autoFocus
          />

          {error && <div className={styles.error} role="alert" style={{ marginTop: 12 }}>{error}</div>}

          <button
            className={styles.btn}
            type="submit"
            disabled={busy || pin.length < 4}
            style={{ width: '100%', marginTop: 16 }}
          >
            {busy ? 'Memeriksa…' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
}
