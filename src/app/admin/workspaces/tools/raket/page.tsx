'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '../../../useAdminAuth';
import { useAdminCall } from '../../useAdminCall';
import { fmtRupiah, fmtShort } from '@/lib/workspace/promo';
import styles from '../../workspaces.module.css';

interface Item { id: string; position: number; name: string; price_original: number | null; price_promo: number; image_url: string | null }
interface Batch { id: string; title: string; status: 'new' | 'processed'; created_at: string; items: Item[] }
interface Data { project: { name: string; formToken: string | null }; batches: Batch[] }

type Sort = 'high' | 'low' | 'sent';

const siteBase = () => (process.env.NEXT_PUBLIC_SITE_URL || (typeof window === 'undefined' ? '' : window.location.origin)).replace(/\/$/, '');

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Aset Raket, step 1: what the client sent through the form, sorted and split into feeds. */
export default function RaketTool() {
  const { supabase } = useAdminAuth();
  const call = useAdminCall();
  const [slug, setSlug] = useState('padel');
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState('');
  const [sort, setSort] = useState<Sort>('high');
  const [perFeed, setPerFeed] = useState(5);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get('slug');
    if (s) setSlug(s);
  }, []);

  const load = useCallback(async () => {
    try {
      const d = await call<Data>(`/api/admin/ws/promo?slug=${encodeURIComponent(slug)}`);
      setData(d);
      setError('');
      setOpenId(cur => cur || d.batches.find(b => b.status === 'new')?.id || '');
    } catch (e) {
      setError((e as Error).message);
    }
  }, [call, slug]);

  useEffect(() => {
    if (supabase) load();
  }, [supabase, load]);

  const formUrl = data?.project.formToken ? `${siteBase()}/f/${data.project.formToken}` : '';
  const message = `Halo kak, tolong isi daftar raket promo lewat form ini ya:\n${formUrl}\nIsi nama raket, harga awal (boleh dikosongkan), harga promo, dan link gambar produknya. Terima kasih.`;

  const flash = async (key: string, text: string) => {
    await copy(text);
    setCopied(key);
    window.setTimeout(() => setCopied(c => (c === key ? '' : c)), 1800);
  };

  const setStatus = async (b: Batch, status: 'new' | 'processed') => {
    await call('/api/admin/ws/promo', { method: 'PATCH', body: JSON.stringify({ id: b.id, status }) });
    load();
  };

  const remove = async (b: Batch) => {
    if (!window.confirm(`Hapus "${b.title}" beserta ${b.items.length} raketnya? Ini tidak bisa dibatalkan.`)) return;
    await call(`/api/admin/ws/promo?id=${b.id}`, { method: 'DELETE' });
    setOpenId('');
    load();
  };

  const batch = data?.batches.find(b => b.id === openId);

  // Highest price first, five per feed, ties kept in the order the client sent them.
  const feeds = useMemo(() => {
    if (!batch) return [];
    const items = [...batch.items];
    if (sort === 'high') items.sort((a, b) => b.price_promo - a.price_promo || a.position - b.position);
    if (sort === 'low') items.sort((a, b) => a.price_promo - b.price_promo || a.position - b.position);
    const out: Item[][] = [];
    for (let i = 0; i < items.length; i += perFeed) out.push(items.slice(i, i + perFeed));
    return out;
  }, [batch, sort, perFeed]);

  return (
    <>
      <div className={styles.sectionHead}>
        <Link href="/admin/workspaces/tools" className={styles.editBtn} style={{ marginLeft: 0 }}>← Tools</Link>
        <h2 className={styles.sectionTitle}>Aset Raket{data ? ` · ${data.project.name}` : ''}</h2>
      </div>

      {error && <div className={styles.error} role="alert" style={{ marginBottom: 16 }}>{error}</div>}
      {!data && !error && <div className={styles.loading}><span className={styles.spinner} /> Memuat…</div>}

      {data && (
        <>
          <section className={styles.tool} style={{ marginBottom: 24 }}>
            <span className={styles.tag}>Link form untuk client</span>
            {formUrl ? (
              <>
                <input className={styles.input} readOnly value={formUrl} onFocus={e => e.currentTarget.select()} aria-label="Link form client" />
                <div className={styles.btnRow}>
                  <button className={styles.btn} onClick={() => flash('link', formUrl)}>{copied === 'link' ? 'Tersalin ✓' : 'Salin link'}</button>
                  <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => flash('msg', message)}>{copied === 'msg' ? 'Tersalin ✓' : 'Salin pesan'}</button>
                  <a className={`${styles.btn} ${styles.btnGhost}`} style={{ display: 'inline-flex', alignItems: 'center' }}
                    href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                  <a className={`${styles.btn} ${styles.btnGhost}`} style={{ display: 'inline-flex', alignItems: 'center' }}
                    href={formUrl} target="_blank" rel="noopener noreferrer">Lihat form</a>
                </div>
                <span className={styles.help}>Link ini rahasia: siapa pun yang memilikinya bisa mengirim daftar. Kirim hanya ke client.</span>
              </>
            ) : (
              <span className={styles.help}>Project ini belum punya link form.</span>
            )}
          </section>

          <div className={styles.sectionHead}>
            <h3 className={styles.sectionTitle}>Daftar masuk <span className={styles.count}>{data.batches.length}</span></h3>
          </div>

          {data.batches.length === 0 && (
            <div className={styles.empty}>Belum ada daftar. Kirim link form di atas ke client, dan kirimannya muncul di sini.</div>
          )}

          <div className={styles.batchList}>
            {data.batches.map(b => (
              <article key={b.id} className={`${styles.batch} ${openId === b.id ? styles.batchOpen : ''}`}>
                <button className={styles.batchHead} onClick={() => setOpenId(openId === b.id ? '' : b.id)} aria-expanded={openId === b.id}>
                  <span className={styles.batchTitle}>{b.title}</span>
                  <span className={styles.sub} style={{ flex: 1, textAlign: 'right' }}>{b.items.length} raket · {fmtDate(b.created_at)}</span>
                  <span className={`${styles.tag} ${b.status === 'processed' ? styles.tagMuted : ''}`}>{b.status === 'processed' ? 'Selesai' : 'Baru'}</span>
                </button>

                {openId === b.id && (
                  <div className={styles.batchBody}>
                    <div className={styles.batchTools}>
                      <label className={styles.label} htmlFor="sort">Urutkan</label>
                      <select id="sort" className={styles.select} style={{ width: 'auto', height: 38 }} value={sort} onChange={e => setSort(e.target.value as Sort)}>
                        <option value="high">Harga tertinggi dulu</option>
                        <option value="low">Harga terendah dulu</option>
                        <option value="sent">Urutan kiriman client</option>
                      </select>
                      <label className={styles.label} htmlFor="per">Per feed</label>
                      <select id="per" className={styles.select} style={{ width: 'auto', height: 38 }} value={perFeed} onChange={e => setPerFeed(Number(e.target.value))}>
                        {[3, 4, 5, 6, 8, 10].map(n => <option key={n} value={n}>{n} raket</option>)}
                      </select>
                    </div>

                    {feeds.map((group, fi) => {
                      const text = group.map((it, i) => `${i + 1}. ${it.name} — ${fmtRupiah(it.price_promo)}`).join('\n');
                      return (
                        <section key={fi} className={styles.feedBlock}>
                          <div className={styles.feedBlockHead}>
                            <h4 className={styles.feedBlockTitle}>Feed {fi + 1}</h4>
                            <button className={styles.editBtn} onClick={() => flash(`f${b.id}${fi}`, text)}>
                              {copied === `f${b.id}${fi}` ? 'Tersalin ✓' : 'Salin daftar'}
                            </button>
                          </div>
                          {group.map((it, i) => (
                            <div key={it.id} className={styles.rackRow}>
                              <span className={styles.rackNum}>{i + 1}</span>
                              <span className={styles.rackName}>{it.name}</span>
                              <span className={styles.rackPrice}>
                                {it.price_original ? <s>{fmtShort(it.price_original)}</s> : null} <b>{fmtShort(it.price_promo)}</b>
                              </span>
                              {it.image_url
                                ? <a className={styles.infoLink} href={it.image_url} target="_blank" rel="noopener noreferrer">Gambar ↗</a>
                                : <span className={styles.help}>tanpa link</span>}
                            </div>
                          ))}
                        </section>
                      );
                    })}

                    <div className={styles.btnRow}>
                      {b.status === 'new'
                        ? <button className={styles.btn} onClick={() => setStatus(b, 'processed')}>Tandai selesai</button>
                        : <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setStatus(b, 'new')}>Tandai baru lagi</button>}
                      <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => remove(b)}>Hapus</button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        </>
      )}
    </>
  );
}
