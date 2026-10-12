'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { fmtRupiah, parseRupiah } from '@/lib/workspace/promo';
import styles from './form.module.css';

interface Row {
  id: string;
  name: string;
  original: string;
  promo: string;
  image: string;
}

const newRow = (): Row => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: '', original: '', promo: '', image: '' });

interface Info { name: string; instagram: string | null }

/** A client's promo list: racket name, optional original price, promo price, product image link. */
export default function PromoForm() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<Info | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [title, setTitle] = useState('');
  const [rows, setRows] = useState<Row[]>([newRow(), newRow(), newRow()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState<number | null>(null);
  const [touched, setTouched] = useState(false);
  const lastRef = useRef<HTMLLIElement>(null);
  const draftKey = `promo-draft-${token}`;

  useEffect(() => {
    fetch(`/api/form/${token}`, { cache: 'no-store' })
      .then(async r => (r.ok ? setInfo(await r.json()) : setInvalid(true)))
      .catch(() => setInvalid(true));
  }, [token]);

  // The list can be long, so what was typed survives an accidental close or reload.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const d = JSON.parse(raw) as { title?: string; rows?: Row[] };
      if (d.title) setTitle(d.title);
      if (Array.isArray(d.rows) && d.rows.length) setRows(d.rows);
    } catch { /* private mode or blocked storage: simply no draft */ }
  }, [draftKey]);

  useEffect(() => {
    if (sent !== null) return;
    try { localStorage.setItem(draftKey, JSON.stringify({ title, rows })); } catch { /* ignore */ }
  }, [title, rows, draftKey, sent]);

  const update = (id: string, patch: Partial<Row>) => setRows(rs => rs.map(r => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id: string) => setRows(rs => (rs.length > 1 ? rs.filter(r => r.id !== id) : rs));
  const add = useCallback((n = 1) => {
    setRows(rs => [...rs, ...Array.from({ length: n }, newRow)]);
    window.setTimeout(() => lastRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
  }, []);

  // A row left completely empty is simply ignored; a half-filled row is an error.
  const filled = useMemo(() => rows.filter(r => r.name.trim() || r.original.trim() || r.promo.trim() || r.image.trim()), [rows]);
  const problems = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of filled) {
      if (!r.name.trim()) map.set(r.id, 'Nama raket belum diisi');
      else if (parseRupiah(r.promo) === null) map.set(r.id, 'Harga promo belum diisi');
      else if (r.original.trim() && parseRupiah(r.original) === null) map.set(r.id, 'Harga awal tidak valid');
    }
    return map;
  }, [filled]);

  const names = new Map<string, number>();
  filled.forEach((r, i) => { const k = r.name.trim().toLowerCase(); if (k && !names.has(k)) names.set(k, i + 1); });

  const canSend = !!title.trim() && filled.length > 0 && problems.size === 0 && !busy;

  const submit = async () => {
    setTouched(true);
    if (!canSend) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/form/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          items: filled.map(r => ({
            name: r.name.trim(),
            priceOriginal: r.original.trim() ? parseRupiah(r.original) : null,
            pricePromo: parseRupiah(r.promo),
            imageUrl: r.image.trim(),
          })),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? 'Gagal mengirim');
      try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
      setSent(json.count ?? filled.length);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  const again = () => {
    setSent(null);
    setTitle('');
    setRows([newRow(), newRow(), newRow()]);
    setTouched(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (invalid) {
    return (
      <div className={styles.root}>
        <div className={styles.center}>
          <h1 className={styles.title}>Link tidak valid</h1>
          <p className={styles.muted}>Link form ini salah atau sudah tidak berlaku. Minta link baru ke desainer kamu.</p>
        </div>
      </div>
    );
  }

  if (sent !== null) {
    return (
      <div className={styles.root}>
        <div className={styles.center}>
          <span className={styles.check} aria-hidden>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
          </span>
          <h1 className={styles.title}>Terkirim</h1>
          <p className={styles.muted}>{sent} raket sudah diterima. Terima kasih, daftarnya langsung diproses.</p>
          <button className={styles.btn} onClick={again}>Kirim daftar promo lain</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <main className={styles.shell}>
        <header className={styles.header}>
          <span className={styles.eyebrow}>{info ? info.name : ' '}{info?.instagram ? ` · @${info.instagram}` : ''}</span>
          <h1 className={styles.title}>Daftar Promo</h1>
          <p className={styles.muted}>
            Isi nama raket, harga, dan link gambar produknya. Cukup ketik harga seperti biasa:
            <b> 3.949 </b>berarti <b>Rp3.949.000</b>.
          </p>
        </header>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="promo-title">Nama promo</label>
          <input id="promo-title" className={styles.input} value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Mis. Promo 10.10" maxLength={80} />
          {touched && !title.trim() && <span className={styles.err}>Nama promo wajib diisi</span>}
        </div>

        <ol className={styles.list}>
          {rows.map((r, i) => {
            const promo = parseRupiah(r.promo);
            const original = parseRupiah(r.original);
            const problem = touched ? problems.get(r.id) : undefined;
            const dupe = r.name.trim() ? names.get(r.name.trim().toLowerCase()) : undefined;
            const isLast = i === rows.length - 1;
            return (
              <li key={r.id} className={`${styles.item} ${problem ? styles.itemBad : ''}`} ref={isLast ? lastRef : undefined}
                style={{ '--i': Math.min(i, 8) } as React.CSSProperties}>
                <div className={styles.itemHead}>
                  <span className={styles.num}>{i + 1}</span>
                  <input className={`${styles.input} ${styles.nameInput}`} value={r.name} onChange={e => update(r.id, { name: e.target.value })}
                    placeholder="Nama raket" aria-label={`Nama raket ${i + 1}`} maxLength={140} />
                  <button type="button" className={styles.x} onClick={() => remove(r.id)} aria-label={`Hapus baris ${i + 1}`} disabled={rows.length === 1}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  </button>
                </div>

                <div className={styles.prices}>
                  <div className={styles.field}>
                    <label className={styles.sub} htmlFor={`o-${r.id}`}>Harga awal <i>(opsional)</i></label>
                    <input id={`o-${r.id}`} className={styles.input} inputMode="numeric" value={r.original}
                      onChange={e => update(r.id, { original: e.target.value })} placeholder="mis. 4.500" />
                    <span className={styles.preview}>{original ? fmtRupiah(original) : ' '}</span>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.sub} htmlFor={`p-${r.id}`}>Harga promo</label>
                    <input id={`p-${r.id}`} className={styles.input} inputMode="numeric" value={r.promo}
                      onChange={e => update(r.id, { promo: e.target.value })} placeholder="mis. 3.949" />
                    <span className={`${styles.preview} ${styles.previewOn}`}>{promo ? fmtRupiah(promo) : ' '}</span>
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.sub} htmlFor={`i-${r.id}`}>Link gambar produk</label>
                  <input id={`i-${r.id}`} className={styles.input} inputMode="url" autoCapitalize="none" autoCorrect="off"
                    value={r.image} onChange={e => update(r.id, { image: e.target.value })}
                    placeholder="Tempel link gambar dari website resmi" />
                </div>

                {problem && <span className={styles.err}>{problem}</span>}
                {!problem && dupe !== undefined && dupe !== filled.findIndex(f => f.id === r.id) + 1 && (
                  <span className={styles.warn}>Nama ini sama dengan baris {dupe}.</span>
                )}
              </li>
            );
          })}
        </ol>

        <div className={styles.addRow}>
          <button type="button" className={styles.btnGhost} onClick={() => add(1)}>+ Tambah raket</button>
          <button type="button" className={styles.btnGhost} onClick={() => add(5)}>+ 5 baris</button>
        </div>

        {error && <div className={styles.errBox} role="alert">{error}</div>}
      </main>

      <div className={styles.bar}>
        <span className={styles.count}><b>{filled.length}</b> raket</span>
        <button className={styles.btn} onClick={submit} disabled={busy}>
          {busy ? 'Mengirim…' : 'Kirim daftar'}
        </button>
      </div>
    </div>
  );
}
