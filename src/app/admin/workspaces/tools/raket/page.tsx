'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '../../../useAdminAuth';
import { useAdminCall } from '../../useAdminCall';
import { fmtRupiah, fmtShort } from '@/lib/workspace/promo';
import { STATUS_LABEL, type FeedStatus } from '@/lib/workspace/types';
import styles from '../../workspaces.module.css';

interface Asset { id: string; width: number | null; height: number | null; size_bytes: number | null; url: string | null; download_url: string | null }
interface Item { id: string; name: string; price_original: number | null; price_promo: number | null; image_url: string | null; asset: Asset | null }
interface Feed { number: number; title: string; status: FeedStatus; items: Item[] }
interface Project { slug: string; name: string; instagram: string | null; feeds: Feed[] }

const SMALL = 1000; // shorter side in px below which a photo is flagged as low resolution

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

const fmtMb = (b: number | null) => (b ? `${(b / 1024 / 1024).toFixed(1)} MB` : '');

/** Aset Raket: every racket from the Daftar Raket in the feed briefs, with its largest product photo kept as an original. */
export default function RaketTool() {
  const { supabase } = useAdminAuth();
  const call = useAdminCall();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState('');
  const [only, setOnly] = useState('');
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState('');
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [zoom, setZoom] = useState<{ name: string; url: string; download: string | null; size: string } | null>(null);
  const [editing, setEditing] = useState('');
  const [draft, setDraft] = useState('');
  const [ranks, setRanks] = useState<Record<string, number>>({});
  const [bulk, setBulk] = useState<{ key: string; done: number; total: number } | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await call<{ projects: Project[] }>('/api/admin/ws/promo');
      setProjects(d.projects);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, [call]);

  useEffect(() => {
    if (supabase) load();
  }, [supabase, load]);

  const flash = async (key: string, text: string) => {
    await copy(text);
    setCopied(key);
    window.setTimeout(() => setCopied(c => (c === key ? '' : c)), 1800);
  };

  /** Takes the largest photo behind the racket's link. Without `force`, an existing image is kept. */
  const grabOne = useCallback(async (it: Item, force = false, rank = 0, link = it.image_url) => {
    setBusy(b => ({ ...b, [it.id]: true }));
    setErrs(e => { const n = { ...e }; delete n[it.id]; return n; });
    try {
      await call('/api/admin/ws/raket-image', { method: 'POST', body: JSON.stringify({ name: it.name, url: link, force, rank, itemId: it.id }) });
    } catch (e) {
      setErrs(x => ({ ...x, [it.id]: (e as Error).message }));
    }
    setBusy(b => { const n = { ...b }; delete n[it.id]; return n; });
  }, [call]);

  const grab = async (it: Item, force = false) => {
    await grabOne(it, force);
    load();
  };

  // "Gambar lain": the next-largest photo of the same product page, for when the biggest one is the wrong angle.
  const another = async (it: Item) => {
    const rank = (ranks[it.id] ?? 0) + 1;
    setRanks(r => ({ ...r, [it.id]: rank }));
    await grabOne(it, true, rank);
    load();
  };

  // A new link (product page or a direct image address) replaces the old one and fetches its largest photo.
  const saveLink = async (it: Item) => {
    const link = draft.trim();
    if (!link) return;
    setRanks(r => ({ ...r, [it.id]: 0 }));
    await grabOne(it, true, 0, link);
    setEditing('');
    load();
  };

  const grabAll = async (key: string, items: Item[]) => {
    const todo = items.filter(i => i.image_url && !i.asset);
    if (!todo.length) return;
    setBulk({ key, done: 0, total: todo.length });
    for (let i = 0; i < todo.length; i++) {
      await grabOne(todo[i]);
      setBulk({ key, done: i + 1, total: todo.length });
      if (i % 4 === 3) load(); // let the first thumbnails appear while the rest is still coming
    }
    setBulk(null);
    load();
  };

  const removeAsset = async (it: Item) => {
    if (!it.asset || !window.confirm(`Hapus gambar "${it.name}" dari library?`)) return;
    await call(`/api/admin/ws/raket-image?id=${it.asset.id}`, { method: 'DELETE' });
    load();
  };

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setZoom(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoom]);

  const q = query.trim().toLowerCase();
  const shown = useMemo(() => (projects ?? [])
    .filter(p => !only || p.slug === only)
    .map(p => ({
      ...p,
      feeds: p.feeds
        .map(f => ({ ...f, items: q ? f.items.filter(i => i.name.toLowerCase().includes(q)) : f.items }))
        .filter(f => f.items.length > 0),
    }))
    .filter(p => p.feeds.length > 0), [projects, only, q]);

  const all = shown.flatMap(p => p.feeds.flatMap(f => f.items));
  const unique = new Set(all.map(i => i.name.trim().toLowerCase())).size;
  const noLink = all.filter(i => !i.image_url).length;
  const withImage = all.filter(i => i.asset).length;

  return (
    <>
      <div className={styles.sectionHead}>
        <Link href="/admin/workspaces/tools" className={styles.editBtn} style={{ marginLeft: 0 }}>← Tools</Link>
        <h2 className={styles.sectionTitle}>Aset Raket</h2>
      </div>

      {error && <div className={styles.error} role="alert" style={{ marginBottom: 16 }}>{error}</div>}
      {!projects && !error && <div className={styles.loading}><span className={styles.spinner} /> Memuat…</div>}

      {projects && (
        <>
          <section className={styles.tool} style={{ marginBottom: 24 }}>
            <span className={styles.tag}>Dari Daftar Raket di brief tiap feed</span>
            <span className={styles.sub} style={{ whiteSpace: 'normal' }}>
              {all.length} raket di {shown.reduce((n, p) => n + p.feeds.length, 0)} feed · {unique} nama unik · {withImage} sudah punya gambar · {noLink} tanpa link
            </span>
            <span className={styles.help}>
              Tombol <b>Ambil gambar</b> mengambil foto terbesar dari link produk dan menyimpan aslinya di sini, siap kamu potong background-nya.
            </span>
            <div className={styles.batchTools}>
              <label className={styles.label} htmlFor="only">Project</label>
              <select id="only" className={styles.select} style={{ width: 'auto', height: 38 }} value={only} onChange={e => setOnly(e.target.value)}>
                <option value="">Semua project</option>
                {projects.map(p => <option key={p.slug} value={p.slug}>{p.name}</option>)}
              </select>
              <input className={styles.input} style={{ flex: 1, minWidth: 160, height: 38 }} value={query}
                onChange={e => setQuery(e.target.value)} placeholder="Cari nama raket…" aria-label="Cari raket" />
            </div>
          </section>

          {shown.length === 0 && (
            <div className={styles.empty}>
              {projects.length === 0
                ? 'Belum ada project yang memakai Daftar Raket. Aktifkan lewat Edit client.'
                : q ? 'Tidak ada raket yang cocok.' : 'Belum ada raket. Isi Daftar Raket di brief sebuah feed, dan raketnya muncul di sini.'}
            </div>
          )}

          {shown.map(p => (
            <div key={p.slug}>
              <div className={styles.sectionHead}>
                <h3 className={styles.sectionTitle}>{p.name}{p.instagram ? ` · @${p.instagram}` : ''}</h3>
              </div>
              {p.feeds.map(f => {
                const key = `${p.slug}-${f.number}`;
                const text = f.items.map((it, i) => `${i + 1}. ${it.name}${it.price_promo ? ` — ${fmtRupiah(it.price_promo)}` : ''}`).join('\n');
                const missing = f.items.filter(i => i.image_url && !i.asset).length;
                const running = bulk?.key === key;
                return (
                  <section key={key} className={styles.feedBlock}>
                    <div className={styles.feedBlockHead}>
                      <h4 className={styles.feedBlockTitle}>
                        Feed {f.number}{f.title && !/^Feed \d+$/.test(f.title) ? ` · ${f.title}` : ''}
                      </h4>
                      <span className={styles.tag}>{STATUS_LABEL[f.status]}</span>
                      <button className={styles.editBtn} onClick={() => flash(key, text)}>
                        {copied === key ? 'Tersalin ✓' : 'Salin daftar'}
                      </button>
                    </div>

                    {(missing > 0 || running) && (
                      <div className={styles.rackBulk}>
                        <button className={`${styles.btn} ${styles.btnGhost}`} style={{ height: 36 }} disabled={!!bulk}
                          onClick={() => grabAll(key, f.items)}>
                          {running ? `Mengambil ${bulk.done}/${bulk.total}…` : `Ambil semua gambar (${missing})`}
                        </button>
                      </div>
                    )}

                    {f.items.map((it, i) => {
                      const a = it.asset;
                      const small = a && Math.min(a.width ?? 0, a.height ?? 0) < SMALL;
                      return (
                        <div key={it.id} className={styles.assetRow}>
                          <span className={styles.rackNum}>{i + 1}</span>
                          <div className={styles.assetThumb}>
                            {a?.url ? (
                              <button className={styles.assetThumbBtn} aria-label={`Perbesar gambar ${it.name}`}
                                onClick={() => setZoom({ name: it.name, url: a.url as string, download: a.download_url, size: `${a.width}×${a.height}${a.size_bytes ? ` · ${fmtMb(a.size_bytes)}` : ''}` })}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={a.url} alt={it.name} loading="lazy" />
                              </button>
                            ) : busy[it.id] ? <span className={styles.spinner} aria-label="Mengambil gambar" /> : <span aria-hidden>–</span>}
                          </div>
                          <div className={styles.assetMain}>
                            <span className={styles.rackName}>{it.name}</span>
                            <span className={styles.rackPrice}>
                              {it.price_original ? <s>{fmtShort(it.price_original)}</s> : null}{' '}
                              {it.price_promo ? <b>{fmtShort(it.price_promo)}</b> : <span className={styles.help}>tanpa harga</span>}
                            </span>
                            <div className={styles.assetActions}>
                              {a && (
                                <>
                                  <span className={`${styles.sizeTag} ${small ? styles.sizeSmall : ''}`}>
                                    {a.width}×{a.height}{a.size_bytes ? ` · ${fmtMb(a.size_bytes)}` : ''}{small ? ' · kecil' : ''}
                                  </span>
                                  {a.download_url && <a className={styles.infoLink} href={a.download_url}>Unduh</a>}
                                  {it.image_url && <button className={styles.assetBtn} disabled={busy[it.id]} onClick={() => another(it)}>
                                    {busy[it.id] ? 'Mengambil…' : 'Gambar lain'}
                                  </button>}
                                  <button className={styles.assetBtn} onClick={() => removeAsset(it)}>Hapus</button>
                                </>
                              )}
                              {!a && it.image_url && (
                                <button className={`${styles.assetBtn} ${styles.assetBtnMain}`} disabled={busy[it.id] || !!bulk} onClick={() => grab(it)}>
                                  {busy[it.id] ? 'Mengambil…' : 'Ambil gambar'}
                                </button>
                              )}
                              <button className={styles.assetBtn} disabled={busy[it.id]}
                                onClick={() => { setEditing(editing === it.id ? '' : it.id); setDraft(it.image_url ?? ''); }}>
                                {it.image_url ? 'Ganti link' : 'Tambah link'}
                              </button>
                              {it.image_url && <a className={styles.infoLink} href={it.image_url} target="_blank" rel="noopener noreferrer">Halaman produk ↗</a>}
                            </div>
                            {editing === it.id && (
                              <form className={styles.assetLinkForm} onSubmit={e => { e.preventDefault(); saveLink(it); }}>
                                <input className={styles.input} inputMode="url" autoCapitalize="none" autoCorrect="off" autoFocus
                                  value={draft} onChange={e => setDraft(e.target.value)}
                                  placeholder="Tempel link halaman produk atau link gambar" aria-label={`Link baru untuk ${it.name}`} />
                                <div className={styles.assetActions}>
                                  <button className={`${styles.assetBtn} ${styles.assetBtnMain}`} type="submit" disabled={busy[it.id] || !draft.trim()}>
                                    {busy[it.id] ? 'Mengambil…' : 'Simpan & ambil gambar'}
                                  </button>
                                  <button className={styles.assetBtn} type="button" onClick={() => setEditing('')}>Batal</button>
                                </div>
                              </form>
                            )}
                            {errs[it.id] && <span className={styles.assetErr}>{errs[it.id]}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </section>
                );
              })}
            </div>
          ))}
        </>
      )}

      {zoom && (
        <div className={styles.zoomScrim} onClick={() => setZoom(null)}>
          <div className={styles.zoomBox} role="dialog" aria-label={`Gambar ${zoom.name}`} onClick={e => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.zoomImg} src={zoom.url} alt={zoom.name} />
            <div className={styles.zoomBar}>
              <span className={styles.zoomName}>{zoom.name}<span className={styles.help}> · {zoom.size}</span></span>
              {zoom.download && <a className={styles.btn} style={{ display: 'inline-flex', alignItems: 'center', height: 38 }} href={zoom.download}>Unduh asli</a>}
              <button className={`${styles.btn} ${styles.btnGhost}`} style={{ height: 38 }} onClick={() => setZoom(null)}>Tutup</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
